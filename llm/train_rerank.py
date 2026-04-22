import os
from pathlib import Path

os.environ["TORCHDYNAMO_DISABLE"] = "1"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"

import torch
from datasets import load_dataset
from peft import PeftModel, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)

BASE_MODEL_PATH = "./models/qwen2.5-3b"
CURRENT_ADAPTER_PATH = "./saves/qwen2.5-3b-lora"
TRAIN_PATH = "./data/train_rerank.jsonl"
SAVE_PATH = "./saves/qwen2.5-3b-lora-rerank"

MAX_SEQ_LENGTH = 300
BATCH_SIZE = 1
GRAD_ACCUM = 4
LEARNING_RATE = 3e-5

TRAIN_EXAMPLES_LIMIT = 100000
MAX_STEPS = 300
SAVE_STEPS = 100

Path(SAVE_PATH).mkdir(parents=True, exist_ok=True)


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


print("Загружаю токенизатор...")
tokenizer = AutoTokenizer.from_pretrained(
    CURRENT_ADAPTER_PATH,
    local_files_only=True,
    use_fast=True,
)

if tokenizer.pad_token_id is None:
    tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

print("Загружаю базовую модель в 4bit...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    quantization_config=bnb_config,
    device_map="auto",
    local_files_only=True,
)

base_model = prepare_model_for_kbit_training(
    base_model,
    use_gradient_checkpointing=True,
)

print("Подключаю текущую LoRA и делаю её trainable...")
model = PeftModel.from_pretrained(
    base_model,
    CURRENT_ADAPTER_PATH,
    is_trainable=True,
    local_files_only=True,
)

model.config.use_cache = False

try:
    model.print_trainable_parameters()
except Exception:
    pass

print("Читаю датасет...")
raw_dataset = load_dataset("json", data_files=TRAIN_PATH, split="train")
raw_dataset = raw_dataset.shuffle(seed=3407)

if TRAIN_EXAMPLES_LIMIT is not None:
    train_limit = min(TRAIN_EXAMPLES_LIMIT, len(raw_dataset))
    raw_dataset = raw_dataset.select(range(train_limit))


def build_tokens(example):
    conversations = example["conversations"]

    if not conversations or len(conversations) < 2:
        return {
            "input_ids": [],
            "attention_mask": [],
            "labels": [],
            "keep": False,
        }

    prompt_messages = conversations[:-1]
    full_messages = conversations

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
        "Попробуй увеличить MAX_SEQ_LENGTH до 224 или проверить TRAIN_PATH."
    )

print("\n===== Пример train sample =====")
print(tokenizer.decode(dataset[0]["input_ids"]))
print("supervised tokens:", sum(1 for x in dataset[0]["labels"] if x != -100))
print("sample length:", len(dataset[0]["input_ids"]))
print("===============================\n")

collator = CausalLMCollator(tokenizer)

training_args = TrainingArguments(
    output_dir=SAVE_PATH,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRAD_ACCUM,
    max_steps=MAX_STEPS,
    learning_rate=LEARNING_RATE,
    logging_steps=5,
    save_strategy="steps",
    save_steps=SAVE_STEPS,
    save_total_limit=2,
    optim="paged_adamw_8bit",
    weight_decay=0.001,
    lr_scheduler_type="linear",
    warmup_steps=20,
    report_to="none",
    remove_unused_columns=False,
    fp16=False,
    bf16=False,
    dataloader_num_workers=0,
    max_grad_norm=1.0,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    data_collator=collator,
)

torch.cuda.empty_cache()
trainer.train()

print(f"Сохраняю адаптер в {SAVE_PATH}")
model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print("Готово.")