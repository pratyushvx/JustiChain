# Judge_Decision/judge_system.py

from Judge_Decision.contradiction_detector.model import ContradictionDetector
from Judge_Decision.evidence_scorer.model import EvidenceScorer
from Judge_Decision.credibility_scorer.model import CredibilityScorer
from Judge_Decision.decision_generator.model import DecisionGenerator
from typing import Dict, Any, List, Optional
import json  # for pretty printing

class Case:
    """Stores the entire history and current state of a legal case."""
    def __init__(self, case_id: str, case_type: str):
        self.case_id = case_id
        self.case_type = case_type
        self.hearings = []
        self.citizen_statements = []
        self.opponent_statements = []
        self.lawyer_statements = []
        self.police_reports = []
        self.evidence_list = []
        self.citizen_cred = 0.5
        self.opponent_cred = 0.5
        self.evidence_score = 0.0
        self.status = "ongoing"
        self.winner = None

    def add_hearing(self,
                    hearing_data: Dict[str, Any],
                    contra_detector: ContradictionDetector,
                    evidence_scorer: EvidenceScorer,
                    cred_scorer: CredibilityScorer,
                    decision_gen: DecisionGenerator) -> Dict[str, Any]:
        """Process one hearing and log each step."""
        hearing_number = len(self.hearings) + 1
        print(f"\n{'='*60}")
        print(f"📋 HEARING #{hearing_number} – Case {self.case_id}")
        print(f"{'='*60}")

        # 1. Extract new information
        citizen_stmt = hearing_data.get("citizen_statement", "")
        opponent_stmt = hearing_data.get("opponent_statement", "")
        lawyer_stmt = hearing_data.get("lawyer_statement", "")
        lawyer_for = hearing_data.get("lawyer_for", "citizen")
        police_report = hearing_data.get("police_report", "")
        new_evidence = hearing_data.get("new_evidence", [])

        print("\n📝 NEW STATEMENTS:")
        if citizen_stmt:
            print(f"  Citizen: {citizen_stmt}")
        if opponent_stmt:
            print(f"  Opponent: {opponent_stmt}")
        if lawyer_stmt:
            print(f"  Lawyer (for {lawyer_for}): {lawyer_stmt}")
        if police_report:
            print(f"  Police: {police_report}")

        # Store raw lawyer statement
        if lawyer_stmt:
            self.lawyer_statements.append({"party": lawyer_for, "text": lawyer_stmt})

        # Combine party statement with lawyer's statement
        combined_cit = citizen_stmt
        combined_opp = opponent_stmt
        if lawyer_stmt:
            if lawyer_for == "citizen":
                combined_cit = (citizen_stmt + " " + lawyer_stmt).strip()
            elif lawyer_for == "opponent":
                combined_opp = (opponent_stmt + " " + lawyer_stmt).strip()

        # Append to history
        if combined_cit:
            self.citizen_statements.append(combined_cit)
        if combined_opp:
            self.opponent_statements.append(combined_opp)
        if police_report:
            self.police_reports.append(police_report)
        if new_evidence:
            self.evidence_list.extend(new_evidence)

        print("\n📦 NEW EVIDENCE ADDED:")
        for ev in new_evidence:
            print(f"  Type: {ev.get('type')}, Description: {ev.get('description')}, Verified: {ev.get('verified')}, Submitter: {ev.get('submitter')}")

        # Use latest combined statements for comparisons
        latest_cit = self.citizen_statements[-1] if self.citizen_statements else ""
        latest_opp = self.opponent_statements[-1] if self.opponent_statements else ""
        latest_police = self.police_reports[-1] if self.police_reports else ""

        # 2. Contradiction detection
        contradictions = {
            "citizen_vs_opponent": contra_detector.detect(latest_cit, latest_opp),
            "citizen_vs_police": contra_detector.detect(latest_cit, latest_police),
            "opponent_vs_police": contra_detector.detect(latest_opp, latest_police)
        }
        overall_contradiction = any(v["contradiction"] for v in contradictions.values())
        print("\n⚡ CONTRADICTION DETECTION:")
        for key, val in contradictions.items():
            print(f"  {key}: {val['label']} (conf: {val['confidence']:.2f})")
        print(f"  Overall contradiction: {overall_contradiction}")

        # 3. Evidence strength
        old_evidence_score = self.evidence_score
        self.evidence_score = evidence_scorer.score_evidence(self.evidence_list)
        print(f"\n📊 EVIDENCE STRENGTH: {old_evidence_score:.2f} → {self.evidence_score:.2f}")

        # 4. Evidence support for parties
        evidence_support = evidence_scorer.get_support_for_parties(
            self.evidence_list,
            " ".join(self.citizen_statements) if self.citizen_statements else "",
            " ".join(self.opponent_statements) if self.opponent_statements else "",
            cred_scorer.sim_model
        )
        print(f"  Support for citizen: {evidence_support.get('citizen', 0):.2f}")
        print(f"  Support for opponent: {evidence_support.get('opponent', 0):.2f}")

        # 5. Update credibility
        past_citizen = self.citizen_statements[:-1]
        past_opponent = self.opponent_statements[:-1]
        old_cit = self.citizen_cred
        old_opp = self.opponent_cred
        self.citizen_cred, self.opponent_cred = cred_scorer.update_credibility(
            self.citizen_cred,
            self.opponent_cred,
            latest_cit,
            latest_opp,
            latest_police,
            contradictions,
            evidence_support,
            past_citizen,
            past_opponent
        )
        print(f"\n⚖️ CREDIBILITY UPDATE:")
        print(f"  Citizen: {old_cit:.2f} → {self.citizen_cred:.2f}")
        print(f"  Opponent: {old_opp:.2f} → {self.opponent_cred:.2f}")

        # 6. Determine winner
        diff = self.citizen_cred - self.opponent_cred
        threshold = 0.2 if self.case_type != "Criminal" else 0.3
        print(f"\n🏆 WINNER DETERMINATION:")
        print(f"  Credibility diff: {diff:.2f} (threshold: {threshold})")
        if diff > threshold:
            winner = "citizen"
            self.status = "resolved"
            self.winner = "citizen"
            print(f"  Winner: CITIZEN")
        elif diff < -threshold:
            winner = "opponent"
            self.status = "resolved"
            self.winner = "opponent"
            print(f"  Winner: OPPONENT")
        else:
            winner = "balanced"
            self.status = "ongoing"
            self.winner = None
            print(f"  Winner: None (balanced)")

        # 7. Generate explanation
        police_exists = len(self.police_reports) > 0
        paragraph = decision_gen.generate(
            self.case_type,
            winner,
            self.evidence_score,
            overall_contradiction,
            police_exists
        )
        print(f"\n📝 EXPLANATION: {paragraph}")

        # 8. Build response
        response = {
            "case_id": self.case_id,
            "hearing_number": hearing_number,
            "status": self.status,
            "winner": self.winner,
            "scores": {
                "citizen_credibility": self.citizen_cred,
                "opponent_credibility": self.opponent_cred,
                "evidence_strength": self.evidence_score,
                "contradiction_detected": overall_contradiction
            },
            "contradictions": contradictions,
            "explanation": paragraph
        }

        self.hearings.append(response)
        print(f"\n{'='*60}\n")
        return response


class JudgeSystem:
    """Orchestrates the entire judge decision system, managing multiple cases."""
    def __init__(self):
        self.contradiction_detector = ContradictionDetector()
        self.evidence_scorer = EvidenceScorer()
        self.credibility_scorer = CredibilityScorer()
        self.decision_generator = DecisionGenerator()
        self.cases: Dict[str, Case] = {}

    def start_case(self, case_id: str, case_type: str) -> Case:
        if case_id in self.cases:
            raise ValueError(f"Case {case_id} already exists")
        case = Case(case_id, case_type)
        self.cases[case_id] = case
        return case

    def process_hearing(self, case_id: str, hearing_data: Dict[str, Any]) -> Dict[str, Any]:
        case = self.cases.get(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")
        return case.add_hearing(
            hearing_data,
            self.contradiction_detector,
            self.evidence_scorer,
            self.credibility_scorer,
            self.decision_generator
        )

    def get_case(self, case_id: str) -> Optional[Case]:
        return self.cases.get(case_id)