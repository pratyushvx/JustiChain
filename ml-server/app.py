from flask import Flask, request, jsonify
from models.statement_analyzer import analyze_statements
from models.case_summary_finder import build_case_summary
from case_classifier.predict_model import CaseTypePredictor
from _init.n import generate_ai_analysis
from Judge_Decision.judge_system import JudgeSystem

app = Flask(__name__)

print("Loading Case Type Predictor...")
case_predictor = CaseTypePredictor()

print("Loading Judge Decision System...")
judge_system = JudgeSystem()


@app.route("/")
def home():
    print("✔ Home route called")
    return jsonify({
        "status": "ML server running",
        "service": "AI Judicial Assistant"
    })


@app.route("/predict_case_type", methods=["POST"])
def predict_case_type():

    print("\n========== /predict_case_type called ==========")

    data = request.json
    print("Incoming data:", data)

    if not data or "text" not in data:
        print("❌ Missing text field")
        return jsonify({"error": "text field required"}), 400

    text = data["text"]
    print("Text received:", text)

    result = case_predictor.predict(text)

    print("Prediction result:", result)

    return jsonify({
        "predictedType": result["case_type"],
        "confidence": result["confidence"]
    })


@app.route("/predict", methods=["POST"])
def predict_verdict():

    try:

        print("\n================ NEW /predict REQUEST ================")

        data = request.json
        print("Incoming payload:")
        print(data)

        messages = data.get("messages", [])
        evidence = data.get("evidence", [])
        hearings = data.get("hearings", [])
        admin_review = data.get("adminReview", {})
        previous_ai = data.get("previousAIAnalysis", None)

        print("\nMessages:", messages)
        print("Evidence:", evidence)
        print("Hearings:", hearings)
        print("Previous AI:", previous_ai)

        # ---------------------------
        # BUILD CASE SUMMARY
        # ---------------------------

        case_data = {
            "hearings": hearings,
            "evidence": evidence,
            "adminReview": admin_review
        }

        print("\n➡ Building case summary...")
        summary = build_case_summary(case_data)
        print("Case summary built.")

        print("\n➡ Running statement analyzer...")
        statement_result = analyze_statements(messages)
        print("Statement analysis:", statement_result)

        # ---------------------------
        # EXTRACT STATEMENTS
        # ---------------------------

        citizen_stmt = ""
        opponent_stmt = ""
        lawyer_stmt = ""
        police_report = ""

        for msg in messages:

            # FIX: handle sender OR from
            sender = msg.get("sender", msg.get("from", "")).lower()
            text = msg.get("text", "")

            if sender == "citizen":
                citizen_stmt = text

            elif sender == "opponent":
                opponent_stmt = text

            elif sender == "lawyer":
                lawyer_stmt = text

            elif sender == "police":
                police_report = text

        print("\nExtracted Statements:")
        print("Citizen:", citizen_stmt)
        print("Opponent:", opponent_stmt)
        print("Lawyer:", lawyer_stmt)
        print("Police:", police_report)

        # ---------------------------
        # PROCESS EVIDENCE
        # ---------------------------

        evidence_list = []

        for ev in evidence:

            evidence_list.append({
                "type": ev.get("type", "other"),
                "description": ev.get("description", ""),
                "verified": ev.get("verified", False),
                "submitter": ev.get("submitter", "unknown")
            })

        print("\nProcessed Evidence:")
        print(evidence_list)

        # ---------------------------
        # TEMP CASE ID
        # ---------------------------

        case_id = "temp_" + str(hash(str(data)) % 10000)

        print("\nTemporary Case ID:", case_id)

        # ---------------------------
        # PREPARE TEXT FOR CLASSIFIER
        # ---------------------------

        combined_text = f"{citizen_stmt} {opponent_stmt}".strip()

        if combined_text == "":
            print("⚠ Combined text empty, using summary instead")
            combined_text = (
                summary.get("citizen_text", "") + " " +
                summary.get("opponent_text", "") + " " +
                summary.get("police_text", "")
            )

        print("\nCombined text sent to classifier:")
        print(combined_text)

        # ---------------------------
        # CASE TYPE PREDICTION
        # ---------------------------

        print("\n➡ Predicting case type...")
        case_result = case_predictor.predict(combined_text)
        case_type = case_result["case_type"]

        print("Predicted case type:", case_type)

        # ---------------------------
        # JUDGE SYSTEM
        # ---------------------------

        print("\n➡ Starting judge system...")
        judge_system.start_case(case_id, case_type)

        hearing_data = {
            "citizen_statement": citizen_stmt,
            "opponent_statement": opponent_stmt,
            "lawyer_statement": lawyer_stmt,
            "police_report": police_report,
            "new_evidence": evidence_list
        }

        print("\n➡ Processing hearing...")
        judge_result = judge_system.process_hearing(case_id, hearing_data)

        print("Judge system result:")
        print(judge_result)

        # ---------------------------
        # GEMINI AI ANALYSIS
        # ---------------------------

        print("\n➡ Generating AI reasoning...")

        ai_result = generate_ai_analysis(
            summary,
            judge_result["scores"],
            previous_ai
        )

        print("AI result:")
        print(ai_result)

        # ---------------------------
        # FINAL RESPONSE
        # ---------------------------

        result = {

            "case_summary": summary,

            "statement_analysis": statement_result,

            "contradiction_analysis": {
                "detected": bool(judge_result["scores"]["contradiction_detected"])
            },

            "credibility_scores": {
                "citizen": float(judge_result["scores"]["citizen_credibility"]),
                "opponent": float(judge_result["scores"]["opponent_credibility"])
            },

            "urgency_analysis": None,

            "evidence_analysis": {
                "strength": float(judge_result["scores"]["evidence_strength"])
            },

            "decision_fusion": {
                "winner": str(judge_result["winner"]),
                "explanation": str(judge_result["explanation"])
            },

            "ai_suggestion": ai_result
        }

        print("\n✅ FINAL RESPONSE:")
        print(result)

        return jsonify(result)

    except Exception as e:

        print("\n❌ ERROR OCCURRED:")
        print(e)

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":

    print("🚀 ML Server Started on http://localhost:8000")

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True
    )