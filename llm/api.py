import json
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

BASE_MODEL_PATH = "./models/qwen2.5-3b"
ADAPTER_PATH = "./saves/qwen2.5-3b-lora"
API_MODEL_NAME = "qwen2.5-3b-lora"

HOST = "0.0.0.0"
PORT = 8000
ALLOWED_ORIGIN = "http://localhost:4200"

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


def generate_chat(messages, max_tokens: int, temperature: float, top_p: float) -> dict[str, Any]:
    prompt_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt_text, return_tensors="pt")
    inputs = {k: v.to(MODEL_DEVICE) for k, v in inputs.items()}

    do_sample = temperature > 0.0

    generate_kwargs = {
        **inputs,
        "max_new_tokens": max_tokens,
        "do_sample": do_sample,
        "pad_token_id": tokenizer.pad_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "use_cache": True,
    }

    if do_sample:
        generate_kwargs["temperature"] = temperature
        generate_kwargs["top_p"] = top_p

    with torch.inference_mode():
        output_ids = model.generate(**generate_kwargs)

    prompt_len = int(inputs["input_ids"].shape[1])
    completion_ids = output_ids[0][prompt_len:]
    content = tokenizer.decode(completion_ids, skip_special_tokens=True).strip()

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
        "usage": {
            "prompt_tokens": prompt_len,
            "completion_tokens": int(len(completion_ids)),
            "total_tokens": prompt_len + int(len(completion_ids)),
        },
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