class DecisionGenerator:
    def __init__(self):
        self.templates = {
            "Civil": {
                "citizen": "The complainant's account appears more credible and is supported by the evidence.",
                "opponent": "The respondent's version is more consistent with the available materials.",
                "balanced": "Both parties present plausible claims; the evidence is inconclusive.",
                "contradiction": "There are material contradictions between the statements, reducing reliability."
            },
            "Criminal": {
                "citizen": "The prosecution's case is strengthened by credible testimony and evidence.",
                "opponent": "The defense has raised reasonable doubt through consistent statements.",
                "balanced": "The evidence is inconclusive; the benefit of doubt may apply.",
                "contradiction": "Conflicting accounts undermine the reliability of the witnesses."
            },
            "Land": {
                "citizen": "The complainant's claim of ownership is supported by documentary evidence.",
                "opponent": "The respondent's possession and records tilt the balance.",
                "balanced": "Boundaries and titles are disputed; a site inspection may be required.",
                "contradiction": "Survey reports and witness statements conflict significantly."
            },
            "Discrimination": {
                "citizen": "The evidence suggests a pattern of discriminatory behavior.",
                "opponent": "The respondent has provided a legitimate non‑discriminatory explanation.",
                "balanced": "The allegations are serious but lack corroboration.",
                "contradiction": "The timelines and events described are inconsistent."
            }
        }

    def generate(self,
                 case_type: str,
                 winner: str,
                 evidence_score: float,
                 contradiction: bool,
                 police_exists: bool) -> str:
        """
        Returns a short paragraph explaining the judge's reasoning.
        """
        lines = []
        tpl = self.templates.get(case_type, self.templates["Civil"])

        if winner == "citizen":
            lines.append(tpl["citizen"])
        elif winner == "opponent":
            lines.append(tpl["opponent"])
        else:
            lines.append(tpl["balanced"])

        if contradiction:
            lines.append(tpl["contradiction"])

        if evidence_score > 0.7:
            lines.append("The evidence is strong and clearly points to one side.")
        elif evidence_score < 0.3:
            lines.append("The evidence is weak and does not tip the balance.")

        if police_exists:
            lines.append("The police report has been taken into consideration.")

        return " ".join(lines)


if __name__ == "__main__":
    gen = DecisionGenerator()
    text = gen.generate("Civil", "citizen", 0.85, False, True)
    print(text)