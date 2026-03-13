const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema({
    caseId: {
        type: String, // Kept as String to match existing CaseId format (e.g., JC-12345)
        required: true,
        index: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    uploaderRole: {
        type: String,
        enum: ["citizen", "lawyer", "police", "judge"],
        required: true
    },

    // File details
    type: {
        type: String,
        enum: ["PDF", "IMAGE", "STATEMENT", "OTHER"],
        required: true
    },
    filePath: {
        type: String // Path relative to /uploads
    },
    fileName: String,

    description: String,

    extractedText: {
        type: String // OCR result or direct text input
    },

    metadata: {
        fileHash: String,
        sizeKB: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },

    // 🧠 ML Analysis Results
    mlScores: {
        authenticityScore: { type: Number, default: 0 },   // 0–1 (Fake vs Real)
        consistencyScore: { type: Number, default: 0 },    // vs other statements
        clarityScore: { type: Number, default: 0 },        // Quality of evidence
        recencyScore: { type: Number, default: 0 },        // Timestamp weight
        finalEvidenceScore: { type: Number, default: 0 }   // Aggregated score
    },

    status: {
        type: String,
        enum: ["PENDING", "VERIFIED", "FLAGGED", "ANALYZING", "WRONG_DOCUMENT", "VERIFIED_CORRECT"],
        default: "PENDING"
    }
}, { timestamps: true });

module.exports = mongoose.model("Evidence", evidenceSchema);
