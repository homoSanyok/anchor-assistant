import time
import uuid
from typing import List, Literal

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

BASE_MODEL_PATH = "./models/qwen2.5-3b"
ADAPTER_PATH = "./saves/qwen2.5-3b-lora"
API_MODEL_NAME = "qwen2.5-3b-lora"

HOST = "0.0.0.0"
PORT = 8000

app = FastAPI(title="Qwen2.5-3B LoRA API")


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = API_MODEL_NAME
    messages: List[ChatMessage]
    max_tokens: int = Field(default=128, ge=1, le=512)
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, gt=0.0, le=1.0)
    stream: bool = False


print("Загружаю токенизатор и модель...")

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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": API_MODEL_NAME,
        "device": str(MODEL_DEVICE),
    }


@app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest):
    if req.stream:
        raise HTTPException(status_code=400, detail="stream=true пока не поддерживается")

    if not req.messages:
        raise HTTPException(status_code=400, detail="messages не должен быть пустым")

    messages = [m.model_dump() for m in req.messages]

    prompt_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt_text, return_tensors="pt")
    inputs = {k: v.to(MODEL_DEVICE) for k, v in inputs.items()}

    do_sample = req.temperature > 0.0

    generate_kwargs = {
        **inputs,
        "max_new_tokens": req.max_tokens,
        "do_sample": do_sample,
        "pad_token_id": tokenizer.pad_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "use_cache": True,
    }

    if do_sample:
        generate_kwargs["temperature"] = req.temperature
        generate_kwargs["top_p"] = req.top_p

    with torch.inference_mode():
        output_ids = model.generate(**generate_kwargs)

    prompt_len = inputs["input_ids"].shape[1]
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
            "prompt_tokens": int(prompt_len),
            "completion_tokens": int(len(completion_ids)),
            "total_tokens": int(prompt_len + len(completion_ids)),
        },
    }


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)