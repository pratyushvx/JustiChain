from transformers import pipeline
from typing import Dict, Any

class ContradictionDetector:
    def __init__(self):
        self.classifier = pipeline(
            "text-classification",
            model="contradiction_detector/fine_tuned_model",
            device=-1
        )

    def detect(self, text1: str, text2: str) -> Dict[str, Any]:
        """
        Returns a dict with keys:
            contradiction (bool)
            confidence (float)
            label (str) – one of "CONTRADICTION", "ENTAILMENT", "NEUTRAL"
        """
        if not text1 or not text2:
            return {"contradiction": False, "confidence": 0.0, "label": "NEUTRAL"}
        # The model expects a single string with a separator
        result = self.classifier(f"{text1} </s></s> {text2}")[0]
        label = result['label']
        score = result['score']
        is_contradiction = (label == "CONTRADICTION")
        return {
            "contradiction": is_contradiction,
            "confidence": score if is_contradiction else 1 - score,
            "label": label
        }