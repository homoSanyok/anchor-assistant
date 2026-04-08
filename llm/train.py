import os
os.environ["TORCHDYNAMO_DISABLE"] = "1"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from pathlib import Path
from datasets import load_dataset
from unsloth import FastModel
from unsloth.chat_templates import get_chat_template
from trl import SFTTrainer, SFTConfig

MAX_SEQ_LENGTH = 256
MODEL_NAME = "./models/gemma-3-4b"
TRAIN_PATH = "./data/train.jsonl"
SAVE_PATH = "./saves/gemma-3-4b-lora"

Path(SAVE_PATH).mkdir(parents=True, exist_ok=True)

model, tokenizer = FastModel.from_pretrained(
    model_name=MODEL_NAME,
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

dataset = load_dataset("json", data_files=TRAIN_PATH, split="train")

def formatting_prompts_func(examples):
    convos = examples["conversations"]
    texts = [
        tokenizer.apply_chat_template(
            convo,
            tokenize=False,
            add_generation_prompt=False,
        ).removeprefix("<bos>")
        for convo in convos
    ]
    return {"text": texts}

dataset = dataset.map(formatting_prompts_func, batched=True)

response_prefix_ids = tokenizer(
    "<start_of_turn>model\n",
    add_special_tokens=False,
).input_ids

def find_subseq(seq, subseq):
    n, m = len(seq), len(subseq)
    for i in range(n - m + 1):
        if seq[i:i+m] == subseq:
            return i
    return -1

def tokenize_and_mask(example):
    enc = tokenizer(
        example["text"],
        truncation=True,
        max_length=MAX_SEQ_LENGTH,
        padding=False,
    )
    input_ids = enc["input_ids"]
    attention_mask = enc["attention_mask"]

    start = find_subseq(input_ids, response_prefix_ids)
    if start == -1:
        labels = [-100] * len(input_ids)
    else:
        start += len(response_prefix_ids)
        labels = [-100] * start + input_ids[start:]

    return {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "labels": labels,
    }

dataset = dataset.map(
    tokenize_and_mask,
    remove_columns=dataset.column_names,
)

# отфильтруем случаи, где ответ не влез после truncation
dataset = dataset.filter(lambda x: any(v != -100 for v in x["labels"]))

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        per_device_train_batch_size=1,
        gradient_accumulation_steps=32,
        warmup_steps=5,
        max_steps=20,
        learning_rate=2e-4,
        logging_steps=1,
        optim="adamw_8bit",
        weight_decay=0.001,
        lr_scheduler_type="linear",
        seed=3407,
        report_to="none",
        dataset_text_field="",   # не используется, dataset уже токенизирован
        max_seq_length=MAX_SEQ_LENGTH,
    ),
)

trainer.train()

model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print(f"LoRA сохранена в: {SAVE_PATH}")