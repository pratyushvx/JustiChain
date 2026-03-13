from transformers import pipeline
from typing import Dict, Any

class ContradictionDetector:
    def __init__(self):
        print("Downloading/loading roberta-large-mnli model (this may take a few minutes the first time)...")
        self.classifier = pipeline(
            "text-classification",
            model="roberta-large-mnli",
            device=-1,
            framework="pt"
        )
        print("Model ready!")

    def detect(self, text1: str, text2: str) -> Dict[str, Any]:
        if not text1 or not text2:
            return {"contradiction": False, "confidence": 0.0, "label": "NEUTRAL"}
        result = self.classifier(f"{text1} </s></s> {text2}")[0]
        label = result['label']
        score = result['score']
        is_contradiction = (label == "CONTRADICTION")
        return {
            "contradiction": is_contradiction,
            "confidence": score if is_contradiction else 1 - score,
            "label": label
        }

if __name__ == "__main__":
    detector = ContradictionDetector()
    print("\n✅ Model downloaded and ready to use.\n")
    test1 = "The tenant paid rent on the 1st."
    test2 = "The landlord never received payment."
    result = detector.detect(test1, test2)
    print(f"Test pair:\n1: {test1}\n2: {test2}")
    print(f"Contradiction: {result['contradiction']} (confidence: {result['confidence']:.2f})")