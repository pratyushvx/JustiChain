const axios = require("axios");
const Evidence = require("../models/Evidence");

exports.analyzeEvidence = async (evidenceId) => {
    try {
        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) return;

        const text =
            evidence.extractedText ||
            evidence.description ||
            "";

        // Send to Flask
        const response = await axios.post(
            "http://localhost:5001/analyze",
            { text }
        );

        const { status, authenticityScore } = response.data;

        // Update DB
        await Evidence.findByIdAndUpdate(evidenceId, {
            $set: {
                status,
                mlScores: {
                    authenticityScore
                }
            }
        });

        console.log("ML Updated:", evidenceId);

    } catch (err) {
        console.error("ML Service Error:", err.message);
    }
};