const mongoose = require("mongoose");

const CourtroomSessionSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Case",
        required: true
    },

    // Real-time statements (Chat/Arguments)
    statements: [
        {
            from: {
                type: String,
                enum: ["CITIZEN", "LAWYER", "POLICE", "JUDGE", "SYSTEM"],
                required: true
            },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],

    // Snapshot of evidence available during this session
    evidenceSnapshot: [
        {
            evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Evidence" },
            title: String,
            authenticityScore: Number,
            fileUrl: String
        }
    ],

    // Admin's preliminary review
    adminReview: {
        decision: {
            type: String,
            enum: ["VALID", "DOUBTFUL", "INVALID", "PENDING"],
            default: "PENDING"
        },
        remarks: { type: String, default: "" },
        reviewedAt: Date
    },

    // Judge's final decision
    judgeFinalDecision: {
        verdict: {
            type: String,
            enum: ["CITIZEN_WINS", "OPPONENT_WINS", "PENDING"],
            default: "PENDING"
        },
        remarks: String,
        decidedAt: Date
    },

    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("CourtroomSession", CourtroomSessionSchema);
