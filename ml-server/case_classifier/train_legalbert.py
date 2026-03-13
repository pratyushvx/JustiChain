import pandas as pd
import torch
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from datasets import Dataset
import os
import joblib
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import transformers

print(f"Transformers version: {transformers.__version__}")

# Create artifacts folder
os.makedirs('case_classifier/artifacts/legalbert', exist_ok=True)

print("="*50)
print("Starting LegalBERT Training")
print("="*50)

# 1. Load dataset
try:
    df = pd.read_csv('case_classifier/data/legal_cases.csv')
    print(f"✅ Dataset loaded: {len(df)} samples")
except FileNotFoundError:
    print("❌ Error: legal_cases.csv not found in case_classifier/data/")
    print("Please make sure your CSV file is in the correct location.")
    exit()

df = df.dropna(subset=['text', 'label'])
print(f"✅ After removing empty rows: {len(df)} samples")

# Show class distribution
print("\n📊 Class Distribution:")
print(df['label'].value_counts())

# 2. Encode labels
label_encoder = LabelEncoder()
df['label_enc'] = label_encoder.fit_transform(df['label'])
print(f"\n✅ Label encoding complete")
print(f"   Classes: {list(label_encoder.classes_)}")

# Save label encoder
joblib.dump(label_encoder, 'case_classifier/artifacts/legalbert/label_encoder.pkl')
print("✅ Label encoder saved")

# 3. Split data
X = df['text'].tolist()
y = df['label_enc'].tolist()
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n✅ Data split:")
print(f"   Training: {len(X_train)} samples")
print(f"   Testing: {len(X_test)} samples")

# 4. Load LegalBERT tokenizer
print("\n⏳ Loading LegalBERT tokenizer...")
model_name = "nlpaueb/legal-bert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
print("✅ Tokenizer loaded")

# 5. Tokenize function
def tokenize_function(examples):
    return tokenizer(examples['text'], truncation=True, padding='max_length', max_length=512)

# 6. Create Hugging Face Datasets
print("\n⏳ Creating datasets...")
train_data = Dataset.from_dict({'text': X_train, 'label': y_train})
test_data = Dataset.from_dict({'text': X_test, 'label': y_test})

print("⏳ Tokenizing training data...")
train_data = train_data.map(tokenize_function, batched=True)
print("⏳ Tokenizing test data...")
test_data = test_data.map(tokenize_function, batched=True)

# Set format for PyTorch
train_data.set_format(type='torch', columns=['input_ids', 'attention_mask', 'label'])
test_data.set_format(type='torch', columns=['input_ids', 'attention_mask', 'label'])
print("✅ Datasets ready")

# 7. Load pre-trained LegalBERT model
print("\n⏳ Loading LegalBERT model...")
num_labels = len(label_encoder.classes_)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=num_labels
)
print("✅ Model loaded")

# 8. Define training arguments (compatible with transformers 5.3.0)
training_args = TrainingArguments(
    output_dir='./results',
    save_strategy="epoch",               # Save after each epoch
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_steps=10,
    report_to="none",                     # Disable wandb/tensorboard
)

# 9. Compute metrics function
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='weighted')
    acc = accuracy_score(labels, predictions)
    return {'accuracy': acc, 'f1': f1, 'precision': precision, 'recall': recall}

# 10. Create Trainer (without tokenizer argument – fixed!)
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_data,
    eval_dataset=test_data,
    data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
    compute_metrics=compute_metrics,
)

# 11. Train
print("\n" + "="*50)
print("🚀 Starting Training...")
print("="*50 + "\n")
trainer.train()

# 12. Save the fine-tuned model and tokenizer
print("\n💾 Saving model...")
model.save_pretrained('case_classifier/artifacts/legalbert')
tokenizer.save_pretrained('case_classifier/artifacts/legalbert')

print("\n" + "="*50)
print("✅ Training Complete!")
print(f"Model saved to: case_classifier/artifacts/legalbert")
print("="*50)

# 13. Evaluate on test set
print("\n📊 Evaluating on test set...")
metrics = trainer.evaluate()
print(metrics)

# 14. Quick test
print("\n🔍 Quick Test:")
test_text = "The accused is charged with theft."
inputs = tokenizer(test_text, return_tensors='pt', truncation=True, padding=True, max_length=512)
with torch.no_grad():
    outputs = model(**inputs)
    predictions = torch.softmax(outputs.logits, dim=-1)
    pred_class = label_encoder.inverse_transform([predictions.argmax().item()])[0]
    confidence = predictions.max().item()
print(f"Test text: '{test_text}'")
print(f"Predicted: {pred_class} (confidence: {confidence:.4f})")
