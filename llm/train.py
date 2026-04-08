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
from unsloth import FastModel
from unsloth.chat_templates import get_chat_template


# =========================
# Настройки
# =========================
MODEL_PATH = "./models/gemma-3-4b"
TRAIN_PATH = "./data/train.jsonl"
SAVE_PATH = "./saves/gemma-3-4b-lora"

# Для GTX 1660 SUPER лучше начинать с 320.
# Если снова будет OOM -> 256
# Если датасет будет слишком сильно резаться -> 384
MAX_SEQ_LENGTH = 384

BATCH_SIZE = 1
GRAD_ACCUM = 32
NUM_EPOCHS = 1
LEARNING_RATE = 2e-4

Path(SAVE_PATH).mkdir(parents=True, exist_ok=True)


# =========================
# Утилиты
# =========================
def find_subsequence(seq, subseq):
    n, m = len(seq), len(subseq)
    if m == 0 or m > n:
        return -1
    for i in range(n - m + 1):
        if seq[i:i + m] == subseq:
            return i
    return -1


def cleanup_user_text(text: str) -> str:
    text = text.strip()

    text = text.replace("Пользователь хочет найти раздел.\n\n", "")
    text = text.replace("Найди нужный путь.\n\n", "")

    query_match = re.search(
        r"ЗАПРОС:\s*(.*?)\s*ДОСТУПНЫЕ ЯКОРЯ:\s*(.*)",
        text,
        flags=re.S,
    )

    if not query_match:
        return text

    query = query_match.group(1).strip()
    anchors_raw = query_match.group(2).strip()

    cleaned_lines = []
    for line in anchors_raw.splitlines():
        line = line.strip()
        if not line:
            continue

        # Убираем шумные служебные слова, чтобы влезало больше полезного текста
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
        role = msg.get("role", "").strip()
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
        if self.pad_to_multiple_of is not None:
            max_len = ((max_len + self.pad_to_multiple_of - 1) // self.pad_to_multiple_of) * self.pad_to_multiple_of

        input_ids = []
        attention_mask = []
        labels = []

        pad_id = self.tokenizer.pad_token_id

        for f in features:
            seq_len = len(f["input_ids"])
            pad_len = max_len - seq_len

            input_ids.append(f["input_ids"] + [pad_id] * pad_len)
            attention_mask.append(f["attention_mask"] + [0] * pad_len)
            labels.append(f["labels"] + [-100] * pad_len)

        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }


# =========================
# Модель
# =========================
model, tokenizer = FastModel.from_pretrained(
    model_name=MODEL_PATH,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
    load_in_8bit=False,
    full_finetuning=False,
)

model = FastModel.get_peft_model(
    model,
    finetune_vision_layers=False,
    finetune_language_layers=True,
    finetune_attention_modules=True,
    finetune_mlp_modules=True,
    r=4,
    lora_alpha=4,
    lora_dropout=0,
    bias="none",
    random_state=3407,
    use_gradient_checkpointing=True,
)

tokenizer = get_chat_template(tokenizer, chat_template="gemma-3")

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

response_prefix_ids = tokenizer(
    "<start_of_turn>model\n",
    add_special_tokens=False,
).input_ids


def build_tokens(example):
    conversation = [
        {"role": "user", "content": example["user_text"]},
        {"role": "assistant", "content": example["assistant_text"]},
    ]

    text = tokenizer.apply_chat_template(
        conversation,
        tokenize=False,
        add_generation_prompt=False,
    ).removeprefix("<bos>")

    input_ids = tokenizer(
        text,
        add_special_tokens=False,
        truncation=False,
    ).input_ids

    response_start = find_subsequence(input_ids, response_prefix_ids)
    if response_start == -1:
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    # Если пример длиннее окна:
    # оставляем хвост, чтобы ответ точно не отрезался.
    if len(input_ids) > MAX_SEQ_LENGTH:
        input_ids = input_ids[-MAX_SEQ_LENGTH:]

    response_start = find_subsequence(input_ids, response_prefix_ids)
    if response_start == -1:
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    response_tokens_start = response_start + len(response_prefix_ids)
    labels = [-100] * response_tokens_start + input_ids[response_tokens_start:]

    # Если после маскирования не осталось ни одного токена ответа — выбрасываем
    if not any(x != -100 for x in labels):
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    return {
        "input_ids": input_ids,
        "attention_mask": [1] * len(input_ids),
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
        "Увеличь MAX_SEQ_LENGTH до 384 или ещё сильнее сокращай текст примеров."
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