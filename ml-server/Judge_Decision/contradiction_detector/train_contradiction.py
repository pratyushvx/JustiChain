import pandas as pd
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)
from datasets import Dataset
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

# 1. Load your dataset
df = pd.read_csv("data.csv")   # change to your file
df = df.dropna(subset=['premise', 'hypothesis', 'label'])
print(f"Loaded {len(df)} samples.")
print(df['label'].value_counts())

# 2. Split
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# 3. Load the pre‑trained MNLI model and tokenizer
model_name = "roberta-large-mnli"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=3,
    ignore_mismatched_sizes=True   # in case the classifier head differs
)

# 4. Tokenize
def tokenize_function(examples):
    return tokenizer(
        examples['premise'],
        examples['hypothesis'],
        truncation=True,
        padding='max_length',
        max_length=128
    )

train_dataset = Dataset.from_pandas(train_df[['premise', 'hypothesis', 'label']])
test_dataset = Dataset.from_pandas(test_df[['premise', 'hypothesis', 'label']])

train_dataset = train_dataset.map(tokenize_function, batched=True)
test_dataset = test_dataset.map(tokenize_function, batched=True)

train_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
test_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])

# 5. Training arguments – use smaller learning rate for fine‑tuning
training_args = TrainingArguments(
    output_dir='./fine_tuned_contradiction',
    evaluation_strategy="steps",
    save_strategy="steps",
    eval_steps=500,
    save_steps=500,
    learning_rate=1e-5,           # lower than usual to preserve pre‑trained knowledge
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_steps=10,
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    acc = accuracy_score(labels, predictions)
    return {"accuracy": acc}

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics,
)

# 6. Train
trainer.train()

# 7. Save the fine‑tuned model
model.save_pretrained("fine_tuned_contradiction")
tokenizer.save_pretrained("fine_tuned_contradiction")
print("✅ Fine‑tuned model saved to fine_tuned_contradiction")