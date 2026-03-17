import google.generativeai as genai
import json
import re

# Configure Gemini API directly with key
genai.configure(api_key="my-api-key")

# Use free model
model = genai.GenerativeModel("gemini-2.5-flash")


def generate_ai_analysis(case_summary, judge_scores=None, previous_ai=None):

    print("\n========== GENERATING AI ANALYSIS ==========")

    judge_info = ""
    if judge_scores:
        judge_info = f"""
Preliminary judge system scores:
- Citizen credibility: {judge_scores.get('citizen_credibility', 'N/A')}
- Opponent credibility: {judge_scores.get('opponent_credibility', 'N/A')}
- Evidence strength: {judge_scores.get('evidence_strength', 'N/A')}
- Contradiction detected: {judge_scores.get('contradiction_detected', 'N/A')}
"""

    previous_info = ""
    if previous_ai:
        previous_info = f"""
Previous AI analysis from earlier hearing:

Prediction: {previous_ai.get('aiPrediction')}
Confidence: {previous_ai.get('aiConfidence')}
Citizen credibility: {previous_ai.get('aiCitizenCredibility')}
Opponent credibility: {previous_ai.get('aiOpponentCredibility')}
Evidence score: {previous_ai.get('aiEvidenceScore')}
Contradiction score: {previous_ai.get('aiContradictionScore')}

Use this as context but reevaluate the case based on new information.
"""

    prompt = f"""
You are an AI judicial assistant helping a judge analyze a courtroom dispute.

Case Summary:
{json.dumps(case_summary, indent=2)}

{judge_info}

{previous_info}

Important rules for decision:

1. If evidence strongly supports the citizen → prediction = "CITIZEN_WINS"
2. If evidence strongly supports the opponent → prediction = "OPPONENT_WINS"
3. If evidence is unclear or incomplete → prediction = "NEXT_HEARING"

Evaluate:

• credibility of citizen (0-1)
• credibility of opponent (0-1)
• police investigation reliability (0-1)
• evidence strength (0-1)
• contradictions (0-1)

Return ONLY valid JSON:

{{
  "prediction": "CITIZEN_WINS | OPPONENT_WINS | NEXT_HEARING",
  "confidence": number_between_0_and_1,
  "evidenceScore": number_between_0_and_1,
  "citizenCredibility": number_between_0_and_1,
  "opponentCredibility": number_between_0_and_1,
  "policeReliability": number_between_0_and_1,
  "contradictionScore": number_between_0_and_1,
  "recommendation": "short reasoning"
}}
"""

    print("\n========== GEMINI PROMPT ==========")
    print(prompt)

    response = model.generate_content(prompt)

    print("\n========== GEMINI RAW RESPONSE ==========")
    print(response.text)

    try:
        # Clean Gemini markdown formatting
        text = response.text.strip()

        # Remove ```json blocks if present
        if "```" in text:
            text = re.sub(r"```json|```", "", text).strip()

        # Extract JSON object
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            text = json_match.group(0)

        result = json.loads(text)

        print("\n========== PARSED AI RESULT ==========")
        print(json.dumps(result, indent=2))

        return result

    except Exception as e:

        print("\n⚠️ JSON PARSE FAILED:", e)

        result = {
            "prediction": "NEXT_HEARING",
            "confidence": 0.5,
            "evidenceScore": 0.5,
            "citizenCredibility": 0.5,
            "opponentCredibility": 0.5,
            "policeReliability": 0.5,
            "contradictionScore": 0.5,
            "recommendation": response.text
        }

    print("\n========== PARSED AI RESULT ==========")
    print(json.dumps(result, indent=2))

    return result
