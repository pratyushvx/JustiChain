from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

class CaseSummarizer:
    def __init__(self):
        print("🔄 Loading LSA summarizer...")
        self.summarizer = LsaSummarizer()
        print("✅ Summarizer Ready!")

    def summarize(self, text):
        if not text or len(text.strip()) == 0:
            return "No summary available"

        parser = PlaintextParser.from_string(text, Tokenizer("english"))

        summary_sentences = self.summarizer(parser.document, 3)

        summary = " ".join(str(sentence) for sentence in summary_sentences)

        return summary