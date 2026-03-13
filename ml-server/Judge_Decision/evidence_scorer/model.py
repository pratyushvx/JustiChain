from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer, util

class EvidenceScorer:
    def __init__(self):
        self.type_weights = {
            "document": 0.8,
            "image": 0.6,
            "video": 0.9,
            "audio": 0.7,
            "other": 0.5
        }

    def score_evidence(self, evidence_list: List[Dict[str, Any]]) -> float:
        """
        Compute overall evidence strength (0–1) based on type and verification.
        """
        if not evidence_list:
            return 0.0
        total = 0.0
        for ev in evidence_list:
            base = self.type_weights.get(ev.get("type", "other"), 0.5)
            verified = ev.get("verified", False)
            weight = base * (2 if verified else 1)
            total += weight
        return min(total / len(evidence_list), 1.0)

    def get_support_for_parties(self,
                                evidence_list: List[Dict[str, Any]],
                                citizen_stmt: str,
                                opponent_stmt: str,
                                sim_model: SentenceTransformer) -> Dict[str, float]:
        """
        For each piece of evidence, measure its semantic similarity to each party's statements.
        Returns a dict with keys 'citizen' and 'opponent' (scores 0–1).
        """
        support = {"citizen": 0.0, "opponent": 0.0}
        if not evidence_list:
            return support

        total_base_weight = 0.0
        for ev in evidence_list:
            base = self.type_weights.get(ev.get("type", "other"), 0.5)
            verified = ev.get("verified", False)
            weight = base * (2 if verified else 1)
            total_base_weight += weight

            desc = ev.get("description", "")
            if not desc:
                continue
            emb_desc = sim_model.encode(desc, convert_to_tensor=True)

            if citizen_stmt:
                emb_cit = sim_model.encode(citizen_stmt, convert_to_tensor=True)
                sim_cit = util.pytorch_cos_sim(emb_desc, emb_cit).item()
            else:
                sim_cit = 0.0

            if opponent_stmt:
                emb_opp = sim_model.encode(opponent_stmt, convert_to_tensor=True)
                sim_opp = util.pytorch_cos_sim(emb_desc, emb_opp).item()
            else:
                sim_opp = 0.0

            submitter = ev.get("submitter", "unknown")
            if submitter == "citizen":
                support["citizen"] += weight * max(sim_cit, 0.2)
            elif submitter == "opponent":
                support["opponent"] += weight * max(sim_opp, 0.2)
            else:
                support["citizen"] += weight * sim_cit
                support["opponent"] += weight * sim_opp

        if total_base_weight > 0:
            support["citizen"] /= total_base_weight
            support["opponent"] /= total_base_weight
        return support


if __name__ == "__main__":
    # Quick test
    scorer = EvidenceScorer()
    evidence = [
        {"type": "document", "description": "Rental agreement showing monthly rent", "verified": True, "submitter": "citizen"},
        {"type": "image", "description": "Photo of locked door", "verified": False, "submitter": "citizen"}
    ]
    citizen = "I paid rent in cash on the 1st."
    opponent = "The tenant never paid."
    from sentence_transformers import SentenceTransformer
    sim_model = SentenceTransformer('all-MiniLM-L6-v2')
    support = scorer.get_support_for_parties(evidence, citizen, opponent, sim_model)
    print("Evidence support:", support)
    print("Overall evidence strength:", scorer.score_evidence(evidence))