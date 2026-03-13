import numpy as np
from sentence_transformers import SentenceTransformer, util
from typing import List, Dict, Any

class CredibilityScorer:
    def __init__(self):
        self.sim_model = SentenceTransformer('all-MiniLM-L6-v2')

    def compute_consistency(self, current_stmt: str, past_statements: List[str]) -> float:
        """
        Average cosine similarity between current statement and all past statements.
        Returns a value between 0 and 1 (clamped).
        """
        if not past_statements:
            return 1.0
        emb_current = self.sim_model.encode(current_stmt, convert_to_tensor=True)
        sims = []
        for past in past_statements:
            emb_past = self.sim_model.encode(past, convert_to_tensor=True)
            sim = util.pytorch_cos_sim(emb_current, emb_past).item()
            sims.append(sim)
        return float(np.mean(sims))

    def update_credibility(self,
                           citizen_cred: float,
                           opponent_cred: float,
                           citizen_stmt: str,
                           opponent_stmt: str,
                           police_report: str,
                           contradictions: Dict[str, Any],
                           evidence_support: Dict[str, float],
                           past_citizen_stmts: List[str],
                           past_opponent_stmts: List[str]) -> (float, float):
        """
        Apply penalties/bonuses based on contradictions, evidence, and consistency.
        Returns updated (citizen_cred, opponent_cred).
        """
        new_cit = citizen_cred
        new_opp = opponent_cred

        # Penalty for contradictions
        if contradictions.get("citizen_vs_opponent", {}).get("contradiction"):
            new_cit -= 0.15
            new_opp -= 0.15
        if contradictions.get("citizen_vs_police", {}).get("contradiction"):
            new_cit -= 0.25
        if contradictions.get("opponent_vs_police", {}).get("contradiction"):
            new_opp -= 0.25

        # Bonus for consistency with past statements
        if past_citizen_stmts:
            consistency = self.compute_consistency(citizen_stmt, past_citizen_stmts)
            new_cit += 0.1 * consistency
        if past_opponent_stmts:
            consistency = self.compute_consistency(opponent_stmt, past_opponent_stmts)
            new_opp += 0.1 * consistency

        # Boost from evidence support
        new_cit += 0.2 * evidence_support.get("citizen", 0.0)
        new_opp += 0.2 * evidence_support.get("opponent", 0.0)

        # Clamp to [0,1]
        new_cit = max(0.0, min(1.0, new_cit))
        new_opp = max(0.0, min(1.0, new_opp))

        return round(new_cit, 2), round(new_opp, 2)


if __name__ == "__main__":
    # Quick test
    scorer = CredibilityScorer()
    contradictions = {
        "citizen_vs_opponent": {"contradiction": True},
        "citizen_vs_police": {"contradiction": False},
        "opponent_vs_police": {"contradiction": False}
    }
    evidence_support = {"citizen": 0.6, "opponent": 0.2}
    past_citizen = ["I paid the rent."]
    past_opponent = ["He never paid."]
    citizen_cred, opponent_cred = scorer.update_credibility(
        0.5, 0.5,
        "I paid rent in cash.",
        "The tenant did not pay.",
        "No complaint filed.",
        contradictions,
        evidence_support,
        past_citizen,
        past_opponent
    )
    print(f"Updated credibility: citizen={citizen_cred}, opponent={opponent_cred}")