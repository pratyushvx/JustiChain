import pandas as pd
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from datasets import Dataset
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

print("🚀 Starting MNLI Fine-Tuning...")

# 1. Load dataset
df = pd.read_csv("data.csv")

# Ensure required columns exist
required_cols = ['premise', 'hypothesis', 'label']
for col in required_cols:
    if col not in df.columns:
        raise ValueError(f"❌ Missing column: {col}")

# Drop empty rows
df = df.dropna(subset=required_cols)

print(f"✅ Loaded {len(df)} samples")

# 🔍 DEBUG: check original labels
print("\nOriginal Labels:")
print(df['label'].unique())

# 2. Clean labels
df['label'] = df['label'].astype(str).str.strip().str.lower()

# Flexible mapping (handles more cases)
label_map = {
    "entailment": 0,
    "neutral": 1,
    "contradiction": 2,
    "contradict": 2,
    "supports": 0,
    "support": 0,
    "unknown": 1
}

df['label'] = df['label'].map(label_map)

# ❗ Remove invalid labels
before = len(df)
df = df.dropna(subset=['label'])
after = len(df)

print(f"\n✅ Removed {before - after} invalid rows")

# Convert to int
df['label'] = df['label'].astype(int)

# Final label check
print("\n✅ Final label distribution:")
print(df['label'].value_counts())

# 🚨 Stop if dataset is empty
if len(df) == 0:
    raise ValueError("❌ No valid data left after label cleaning!")

# 3. Train-test split (SAFE)
train_df, test_df = train_test_split(
    df,
    test_size=0.2,
    random_state=42,
    stratify=df['label'] if len(df['label'].unique()) > 1 else None
)

# 4. Load model
model_name = "roberta-base"   # safer & lighter than large

print("\n⏳ Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_name)

print("⏳ Loading model...")
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=3
)

# 5. Tokenization
def tokenize_function(examples):
    return tokenizer(
        examples['premise'],
        examples['hypothesis'],
        truncation=True,
        padding=True,
        max_length=128
    )

# Convert to HF dataset
train_dataset = Dataset.from_pandas(train_df[['premise', 'hypothesis', 'label']])
test_dataset = Dataset.from_pandas(test_df[['premise', 'hypothesis', 'label']])

print("\n⏳ Tokenizing...")
train_dataset = train_dataset.map(tokenize_function, batched=True)
test_dataset = test_dataset.map(tokenize_function, batched=True)

# Format for PyTorch
train_dataset.set_format(type='torch', columns=['input_ids', 'attention_mask', 'label'])
test_dataset.set_format(type='torch', columns=['input_ids', 'attention_mask', 'label'])

# 6. Training arguments
training_args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=8,   # slightly bigger for speed
    per_device_eval_batch_size=8,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_steps=20,
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    report_to="none"
)

# 7. Metrics
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = torch.argmax(torch.tensor(logits), dim=-1)
    acc = accuracy_score(labels, predictions)
    return {"accuracy": acc}

# 8. Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
)

# 9. Train
print("\n🔥 Training started...\n")
trainer.train()

# 10. Evaluate
print("\n📊 Evaluating...")
metrics = trainer.evaluate()
print(metrics)

# 11. Save model
model.save_pretrained("fine_tuned_contradiction")
tokenizer.save_pretrained("fine_tuned_contradiction")

print("\n✅ Model saved successfully!")