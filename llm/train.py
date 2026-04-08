import os
import re
from pathlib import Path

os.environ["TORCHDYNAMO_DISABLE"] = "1"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"

import torch
from datasets import load_dataset
from transformers import Trainer, TrainingArguments
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template


MODEL_PATH = "./models/qwen2.5-3b"
TRAIN_PATH = "./data/train.jsonl"
SAVE_PATH = "./saves/qwen2.5-3b-lora"

# Для GTX 1660 SUPER начни с 384.
# Если будет OOM -> 320 или 256.
MAX_SEQ_LENGTH = 384

BATCH_SIZE = 1
GRAD_ACCUM = 32
NUM_EPOCHS = 1
LEARNING_RATE = 2e-4

Path(SAVE_PATH).mkdir(parents=True, exist_ok=True)


def cleanup_user_text(text: str) -> str:
    text = (text or "").strip()

    text = text.replace("Пользователь хочет найти раздел.\n\n", "")
    text = text.replace("Найди нужный путь.\n\n", "")

    m = re.search(
        r"ЗАПРОС:\s*(.*?)\s*ДОСТУПНЫЕ ЯКОРЯ:\s*(.*)",
        text,
        flags=re.S,
    )

    if not m:
        return text

    query = m.group(1).strip()
    anchors_raw = m.group(2).strip()

    cleaned_lines = []
    for line in anchors_raw.splitlines():
        line = line.strip()
        if not line:
            continue

        line = re.sub(
            r"\b(Подраздел:|Категория:|Меню:|Раздел:|Панель:)\s*",
            "",
            line,
        )
        line = re.sub(r"\s+", " ", line).strip()
        cleaned_lines.append(line)

    anchors = "\n".join(cleaned_lines)
    return f"Запрос:\n{query}\n\nЯкоря:\n{anchors}"


def normalize_example(example):
    source = None
    if "conversations" in example and example["conversations"] is not None:
        source = example["conversations"]
    elif "messages" in example and example["messages"] is not None:
        source = example["messages"]

    if not source:
        return {"user_text": None, "assistant_text": None}

    user_text = None
    assistant_text = None

    for msg in source:
        role = (msg.get("role") or "").strip()
        content = (msg.get("content") or "").strip()

        if role == "user" and user_text is None:
            user_text = cleanup_user_text(content)
        elif role == "assistant" and assistant_text is None:
            assistant_text = content

    if not user_text or not assistant_text:
        return {"user_text": None, "assistant_text": None}

    return {
        "user_text": user_text,
        "assistant_text": assistant_text,
    }


class CausalLMCollator:
    def __init__(self, tokenizer, pad_to_multiple_of=8):
        self.tokenizer = tokenizer
        self.pad_to_multiple_of = pad_to_multiple_of

    def __call__(self, features):
        max_len = max(len(x["input_ids"]) for x in features)
        if self.pad_to_multiple_of:
            max_len = ((max_len + self.pad_to_multiple_of - 1) // self.pad_to_multiple_of) * self.pad_to_multiple_of

        pad_id = self.tokenizer.pad_token_id

        batch_input_ids = []
        batch_attention_mask = []
        batch_labels = []

        for f in features:
            pad_len = max_len - len(f["input_ids"])
            batch_input_ids.append(f["input_ids"] + [pad_id] * pad_len)
            batch_attention_mask.append(f["attention_mask"] + [0] * pad_len)
            batch_labels.append(f["labels"] + [-100] * pad_len)

        return {
            "input_ids": torch.tensor(batch_input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(batch_attention_mask, dtype=torch.long),
            "labels": torch.tensor(batch_labels, dtype=torch.long),
        }


# =========================
# Модель
# =========================
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_PATH,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=8,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=8,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

tokenizer = get_chat_template(
    tokenizer,
    chat_template="qwen2.5",
)

if tokenizer.pad_token_id is None:
    tokenizer.pad_token = tokenizer.eos_token

model.config.use_cache = False


# =========================
# Датасет
# =========================
raw_dataset = load_dataset("json", data_files=TRAIN_PATH, split="train")
raw_dataset = raw_dataset.map(normalize_example)
raw_dataset = raw_dataset.filter(
    lambda x: x["user_text"] is not None and x["assistant_text"] is not None
)


def build_tokens(example):
    # prompt-only
    prompt_messages = [
        {"role": "user", "content": example["user_text"]},
    ]

    # full prompt + answer
    full_messages = [
        {"role": "user", "content": example["user_text"]},
        {"role": "assistant", "content": example["assistant_text"]},
    ]

    prompt_text = tokenizer.apply_chat_template(
        prompt_messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    full_text = tokenizer.apply_chat_template(
        full_messages,
        tokenize=False,
        add_generation_prompt=False,
    )

    prompt_ids = tokenizer(
        prompt_text,
        add_special_tokens=False,
        truncation=False,
    ).input_ids

    full_ids = tokenizer(
        full_text,
        add_special_tokens=False,
        truncation=False,
    ).input_ids

    if len(full_ids) > MAX_SEQ_LENGTH:
        offset = len(full_ids) - MAX_SEQ_LENGTH
        full_ids = full_ids[offset:]
        prompt_len = max(0, len(prompt_ids) - offset)
    else:
        prompt_len = len(prompt_ids)

    if prompt_len >= len(full_ids):
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    labels = [-100] * prompt_len + full_ids[prompt_len:]

    if not any(x != -100 for x in labels):
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    return {
        "input_ids": full_ids,
        "attention_mask": [1] * len(full_ids),
        "labels": labels,
        "keep": True,
    }


dataset = raw_dataset.map(build_tokens)
before_filter = len(dataset)

dataset = dataset.filter(lambda x: x["keep"] is True)
after_filter = len(dataset)

dataset = dataset.remove_columns(
    [c for c in dataset.column_names if c not in {"input_ids", "attention_mask", "labels"}]
)

print(f"Примеров до filter: {before_filter}")
print(f"Примеров после filter: {after_filter}")

if after_filter == 0:
    raise RuntimeError(
        "После подготовки датасет пустой. "
        "Попробуй MAX_SEQ_LENGTH=512 или ещё сильнее сократи user-текст."
    )

print("\n===== Пример train sample =====")
print(tokenizer.decode(dataset[0]["input_ids"]))
print("supervised tokens:", sum(1 for x in dataset[0]["labels"] if x != -100))
print("sample length:", len(dataset[0]["input_ids"]))
print("===============================\n")


# =========================
# Trainer
# =========================
collator = CausalLMCollator(tokenizer)

training_args = TrainingArguments(
    output_dir=SAVE_PATH,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRAD_ACCUM,
    num_train_epochs=NUM_EPOCHS,
    learning_rate=LEARNING_RATE,
    logging_steps=1,
    save_strategy="epoch",
    optim="adamw_torch",
    weight_decay=0.001,
    lr_scheduler_type="linear",
    warmup_steps=5,
    report_to="none",
    remove_unused_columns=False,
    fp16=False,
    bf16=False,
    dataloader_num_workers=0,
    max_grad_norm=1.0,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    data_collator=collator,
)

torch.cuda.empty_cache()
trainer.train()

model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print(f"LoRA сохранена в: {SAVE_PATH}")