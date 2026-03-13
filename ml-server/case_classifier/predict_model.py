import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import joblib
import os
import re

class CaseTypePredictor:
    def __init__(self, model_path='case_classifier/artifacts/legalbert'):
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.model.eval()  # set to evaluation mode
        # Load label encoder
        self.label_encoder = joblib.load(os.path.join(model_path, 'label_encoder.pkl'))
        # Precompile regex for cleaning (optional, if you want to apply same cleaning as training)
        self.clean_regex = re.compile(r'[^a-zA-Z\s]')

    def _clean_text(self, text):
        """Same basic cleaning as used in training (if any)."""
        text = text.lower()
        text = self.clean_regex.sub('', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def predict(self, text):
        """
        Args:
            text (str): Raw input text.
        Returns:
            dict: {'case_type': str, 'confidence': float}
        """
        # Optionally clean text (if you cleaned during training)
        cleaned = self._clean_text(text)

        # Tokenize
        inputs = self.tokenizer(
            cleaned,
            return_tensors='pt',
            truncation=True,
            padding='max_length',
            max_length=512
        )

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).squeeze().tolist()
            pred_id = torch.argmax(logits, dim=-1).item()

        # Map to label
        pred_label = self.label_encoder.inverse_transform([pred_id])[0]
        confidence = probs[pred_id]

        return {
            'case_type': pred_label,
            'confidence': confidence
        }