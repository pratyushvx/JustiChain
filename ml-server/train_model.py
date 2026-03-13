import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Simple legal dataset
data = {
    "text": [
        "My landlord locked me outside without notice",
        "Someone stole my bike last night",
        "Neighbour illegally occupied my land",
        "I was denied entry because of caste",
        "Tenant not paying rent",
        "Physical assault happened in market",
        "Property boundary dispute",
        "Workplace discrimination due to religion"
    ],
    "label": [
        "Civil",
        "Crime",
        "Land",
        "Discrimination",
        "Civil",
        "Crime",
        "Land",
        "Discrimination"
    ]
}

df = pd.DataFrame(data)

vectorizer = TfidfVectorizer(stop_words="english")
X = vectorizer.fit_transform(df["text"])

model = LogisticRegression()
model.fit(X, df["label"])

joblib.dump(model, "case_classifier.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained and saved")