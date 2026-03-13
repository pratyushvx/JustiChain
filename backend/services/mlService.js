/**
 * 🤖 ML SERVICE (MOCKED DOOR)
 * ----------------------------
 * This service acts as the gateway to the future ML microservice.
 * Currently, it simulates the analysis process.
 */

const Evidence = require("../models/Evidence");
const Case = require("../models/Case");

exports.analyzeEvidence = async (evidenceId) => {
    console.log(`🧠 ML TRIGGER: Analyzing evidence ${evidenceId}...`);

    try {
        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) throw new Error("Evidence not found");

        // 🕒 Simulate ML processing latency (e.g., 2 seconds)
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        // 🎲 Mock Scoring Logic (Placeholder for Python ML API)
        // In production, this would be: await axios.post('http://ml-service/analyze', { file: ... })

        // Simulate smart detection based on file type
        let authenticityScore = 0.95; // Default high for demo
        let consistencyScore = 0.88;
        let clarityScore = 0.90;

        // If it's a PDF, we trust it more in this mock :)
        if (evidence.type === 'PDF') {
            authenticityScore = 0.98;
        }

        const recencyScore = 1.0; // New evidence is always recent

        // Weighted Formula
        const finalScore = (
            (0.35 * authenticityScore) +
            (0.25 * consistencyScore) +
            (0.20 * clarityScore) +
            (0.20 * recencyScore)
        ).toFixed(2);

        // Update Evidence Record
        evidence.mlScores = {
            authenticityScore,
            consistencyScore,
            clarityScore,
            recencyScore,
            finalEvidenceScore: parseFloat(finalScore)
        };

        evidence.status = "VERIFIED"; // Auto-verify for now
        await evidence.save();

        console.log(`✅ ML COMPLETE: Score ${finalScore}`);

        // 🔄 TRIGGER CASE RE-CALCULATION
        await exports.recalculateCaseScore(evidence.caseId);

        return evidence;
    } catch (err) {
        console.error("ML Error:", err);
        throw err;
    }
};

exports.recalculateCaseScore = async (caseId) => {
    console.log(`📊 RE-CALCULATING CASE: ${caseId}`);

    const allEvidence = await Evidence.find({ caseId });

    if (allEvidence.length === 0) return;

    const totalScore = allEvidence.reduce((sum, e) => sum + (e.mlScores?.finalEvidenceScore || 0), 0);
    const avgScore = (totalScore / allEvidence.length).toFixed(2);

    await Case.findOneAndUpdate({ caseId }, {
        evidenceSummary: {
            totalEvidence: allEvidence.length,
            avgEvidenceScore: parseFloat(avgScore),
            highRiskFlags: allEvidence.some(e => e.status === "FLAGGED")
        }
    });

    console.log(`✅ CASE UPDATED: Avg Score ${avgScore}`);
};
