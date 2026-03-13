const mongoose = require("mongoose");

/* =========================
   HEARING SCHEMA
========================= */
const hearingSchema = new mongoose.Schema({
  hearingId: String,
  hearingDate: Date,

  isOpen: Boolean,
  courtRoomId: String,

  // ✅ CHAT LOG
  messages: [
    {
      sender: String,      // judge | citizen | lawyer | police | opponent | SYSTEM
      text: String,
      time: String
    }
  ],

  // ✅ JUDGE ACTIONS
  judgeDecision: {
    type: String,          // WIN | LOSS | SETTLED | NEXT_HEARING
    default: null
  },

  judgementText: String,

  closedAt: Date
});

/* =========================
   ML ANALYSIS SCHEMA
   (Stores outputs from the judge system after each hearing)
========================= */
const mlAnalysisSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },

  hearingNumber: Number,

  /* ML system scores */
  citizenCredibility: Number,
  opponentCredibility: Number,
  evidenceStrength: Number,
  contradictionDetected: Boolean,

  winner: String,
  explanation: String,

  /* AI reasoning scores */
  aiPrediction: String,
  aiConfidence: Number,
  aiEvidenceScore: Number,

  aiCitizenCredibility: Number,
  aiOpponentCredibility: Number,
  aiPoliceReliability: Number,
  aiContradictionScore: Number,

  aiRecommendation: String,

  /* optional fields */
  aiSuggestion: mongoose.Schema.Types.Mixed,
  fullResponse: mongoose.Schema.Types.Mixed

}, { _id: false });
/* =========================
   CASE SCHEMA
========================= */
const caseSchema = new mongoose.Schema({
  caseId: { type: String, unique: true },

  title: String,
  description: String,
  caseType: String,

  /* =========================
     ML PREDICTION FIELDS
     (Added for case type prediction)
  ========================= */
  predictedCaseType: {
    type: String,
    default: null
  },

  predictionConfidence: {
    type: Number,
    default: null
  },

  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  policeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  opponent: {
    name: String,
    email: String
  },

  opponentLawyer: {
    name: String,
    email: String
  },

  status: {
    type: String,
    enum: [
      "CREATED",
      "LAWYER_REQUESTED",
      "LAWYER_ASSIGNED",
      "HEARING_SCHEDULED",
      "CLOSED"
    ],
    default: "CREATED"
  },

  // 🔑 COURTROOM STATE
  courtroomOpen: {
    type: Boolean,
    default: false
  },

  courtRoomId: String,
  courtAccessPassword: String,

  // 📅 CURRENT HEARING DATE (for dashboards)
  hearingDate: Date,

  // 📂 ALL HEARINGS (THIS ENABLES YOUR FUTURE PAGE)
  hearings: {
    type: [hearingSchema],
    default: []
  },

  // 🤖 ML ANALYSIS HISTORY (added for tracking judge decisions over hearings)
  mlAnalyses: {
    type: [mlAnalysisSchema],
    default: []
  },

  // 🔎 EVIDENCE SUMMARY (Auto-updated via ML)
  evidenceSummary: {
    totalEvidence: { type: Number, default: 0 },
    avgEvidenceScore: { type: Number, default: 0 },
    highRiskFlags: { type: Boolean, default: false }
  },

  // 📸 HEARING HISTORY (Snapshot for explainable verdicts)
  hearingSnapshots: [{
    hearingNo: Number,
    date: Date,
    evidenceSnapshotScore: Number,
    verdictSnapshot: String
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Case", caseSchema);