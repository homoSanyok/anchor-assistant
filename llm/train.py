from pathlib import Path

from datasets import load_dataset
from unsloth import FastModel
from unsloth.chat_templates import (
    get_chat_template,
    standardize_data_formats,
    train_on_responses_only,
)
from trl import SFTTrainer, SFTConfig

MAX_SEQ_LENGTH = 2048
MODEL_NAME = "unsloth/gemma-3-4b-it"

TRAIN_PATH = "./data/train.jsonl"
SAVE_PATH = "./saves/gemma-3-4b-lora"

Path(SAVE_PATH).mkdir(parents=True, exist_ok=True)

# 1) Модель
model, tokenizer = FastModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
    load_in_8bit=False,
    full_finetuning=False,
)

# 2) LoRA
model = FastModel.get_peft_model(
    model,
    finetune_vision_layers=False,
    finetune_language_layers=True,
    finetune_attention_modules=True,
    finetune_mlp_modules=True,
    r=8,
    lora_alpha=8,
    lora_dropout=0,
    bias="none",
    random_state=3407,
)

# 3) Шаблон Gemma 3
tokenizer = get_chat_template(
    tokenizer,
    chat_template="gemma-3",
)

# 4) Датасет
dataset = load_dataset("json", data_files=TRAIN_PATH, split="train")
dataset = standardize_data_formats(dataset)

# 5) conversations -> text
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

# 6) train/val split
dataset = dataset.train_test_split(test_size=0.02, seed=3407)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

# 7) Trainer
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    args=SFTConfig(
        dataset_text_field="text",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        num_train_epochs=1,
        learning_rate=2e-4,
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=0.001,
        lr_scheduler_type="linear",
        seed=3407,
        report_to="none",
    ),
)

# 8) Учим только на ответах assistant
trainer = train_on_responses_only(
    trainer,
    instruction_part="<start_of_turn>user\n",
    response_part="<start_of_turn>model\n",
)

trainer.train()

# 9) Сохранение LoRA
model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print(f"LoRA сохранена в: {SAVE_PATH}")