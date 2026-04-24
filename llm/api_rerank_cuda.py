import json
import math
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import torch
import torch.nn.functional as F
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

BASE_MODEL_PATH = "./models/qwen2.5-3b"
ADAPTER_PATH = "./saves/qwen2.5-3b-lora-rerank"
API_MODEL_NAME = "qwen2.5-3b-lora-rerank"

HOST = "0.0.0.0"
PORT = 8000
ALLOWED_ORIGIN = "http://localhost:4200"

SYSTEM_PROMPT = (
    "Ты reranker якорей интерфейса. "
    "По запросу пользователя и одному кандидату-якорю определи, подходит ли этот кандидат. "
    "Отвечай строго только yes или no."
)

print("Загружаю модель...")

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

tokenizer = AutoTokenizer.from_pretrained(
    ADAPTER_PATH,
    local_files_only=True,
    use_fast=True,
)

if tokenizer.pad_token_id is None:
    tokenizer.pad_token = tokenizer.eos_token

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    quantization_config=bnb_config,
    device_map="auto",
    local_files_only=True,
)

model = PeftModel.from_pretrained(
    base_model,
    ADAPTER_PATH,
    local_files_only=True,
)
model.eval()

try:
    MODEL_DEVICE = next(model.parameters()).device
except StopIteration:
    MODEL_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"Модель загружена. Устройство: {MODEL_DEVICE}")


def make_json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def extract_query_and_anchors(messages: list[dict[str, Any]]) -> tuple[str, list[dict[str, str]]]:
    user_content = None
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_content = (msg.get("content") or "").strip()
            break

    if not user_content:
        raise ValueError("не найден user message")

    marker_query = "Запрос:"
    marker_anchors = "Якоря:"

    q_idx = user_content.find(marker_query)
    a_idx = user_content.find(marker_anchors)

    if q_idx == -1 or a_idx == -1 or a_idx <= q_idx:
        raise ValueError("ожидается формат: 'Запрос:' ... 'Якоря:' ...")

    query = user_content[q_idx + len(marker_query):a_idx].strip()
    anchors_block = user_content[a_idx + len(marker_anchors):].strip()

    anchors = []
    for raw_line in anchors_block.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if not line.startswith("#"):
            continue

        parts = [p.strip() for p in line.split(" - ")]
        if len(parts) < 3:
            continue

        selector = parts[0]
        parent_selector = parts[-1]
        anchor = " - ".join(parts[1:-1]).strip()

        if not selector or not anchor or not parent_selector:
            continue

        anchors.append({
            "selector": selector,
            "anchor": anchor,
            "parent_selector": parent_selector,
        })

    if not query:
        raise ValueError("пустой запрос")
    if not anchors:
        raise ValueError("не найдено ни одного якоря")

    return query, anchors


def average_completion_logprob(messages: list[dict[str, str]], answer: str) -> tuple[float, int, int]:
    prompt_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(MODEL_DEVICE)

    full_ids = tokenizer.apply_chat_template(
        messages + [{"role": "assistant", "content": answer}],
        tokenize=True,
        add_generation_prompt=False,
        return_tensors="pt",
    ).to(MODEL_DEVICE)

    prompt_len = int(prompt_ids.shape[1])
    full_len = int(full_ids.shape[1])

    with torch.inference_mode():
        outputs = model(full_ids)
        logits = outputs.logits

    log_probs = F.log_softmax(logits, dim=-1)

    token_logprobs = []
    for pos in range(prompt_len, full_len):
        token_id = full_ids[0, pos]
        lp = log_probs[0, pos - 1, token_id].item()
        token_logprobs.append(lp)

    if not token_logprobs:
        return -1e9, prompt_len, 0

    avg = sum(token_logprobs) / len(token_logprobs)
    completion_tokens = full_len - prompt_len
    return avg, prompt_len, completion_tokens


def score_anchor(query: str, anchor: dict[str, str]) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Запрос:\n{query}\n\n"
                f"Кандидат:\n"
                f"{anchor['selector']} - {anchor['anchor']} - {anchor['parent_selector']}"
            ),
        },
    ]

    yes_score, prompt_tokens, yes_completion_tokens = average_completion_logprob(messages, "yes")
    no_score, _, no_completion_tokens = average_completion_logprob(messages, "no")

    return {
        "selector": anchor["selector"],
        "yes_score": yes_score,
        "no_score": no_score,
        "margin": yes_score - no_score,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": max(yes_completion_tokens, no_completion_tokens),
    }


def rerank_selector_from_messages(messages: list[dict[str, Any]]) -> dict[str, Any]:
    query, anchors = extract_query_and_anchors(messages)

    scored = [score_anchor(query, anchor) for anchor in anchors]
    scored.sort(key=lambda x: x["margin"], reverse=True)

    best = scored[0]

    # Порог можно подкрутить позже. Пока мягкая эвристика.
    # Если лучший кандидат хуже "no", возвращаем not_found.
    best_selector = best["selector"] if best["margin"] >= 0.0 else "not_found"

    prompt_tokens = sum(item["prompt_tokens"] for item in scored)
    completion_tokens = sum(item["completion_tokens"] for item in scored)

    return {
        "selector": best_selector,
        "scores": scored,
        "usage": {
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": int(completion_tokens),
            "total_tokens": int(prompt_tokens + completion_tokens),
        },
    }


def generate_chat(messages, max_tokens: int, temperature: float, top_p: float) -> dict[str, Any]:
    # Интерфейс сохраняем, но для rerank max_tokens / temperature / top_p не используются.
    result = rerank_selector_from_messages(messages)
    content = result["selector"]

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": API_MODEL_NAME,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": result["usage"],
    }


class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Vary", "Origin")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            return make_json_response(self, 200, {
                "status": "ok",
                "model": API_MODEL_NAME,
                "device": str(MODEL_DEVICE),
            })

        return make_json_response(self, 404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            return make_json_response(self, 404, {"error": "not found"})

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            return make_json_response(self, 400, {"error": f"invalid json: {e}"})

        messages = payload.get("messages")
        if not isinstance(messages, list) or not messages:
            return make_json_response(self, 400, {"error": "messages must be a non-empty list"})

        max_tokens = int(payload.get("max_tokens", 128))
        temperature = float(payload.get("temperature", 0.0))
        top_p = float(payload.get("top_p", 1.0))
        stream = bool(payload.get("stream", False))

        if stream:
            return make_json_response(self, 400, {"error": "stream=true пока не поддерживается"})

        try:
            result = generate_chat(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
            return make_json_response(self, 200, result)
        except torch.cuda.OutOfMemoryError:
            torch.cuda.empty_cache()
            return make_json_response(self, 500, {"error": "CUDA out of memory"})
        except Exception as e:
            return make_json_response(self, 500, {"error": str(e)})

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"HTTP API запущен на http://{HOST}:{PORT}")
    server.serve_forever()