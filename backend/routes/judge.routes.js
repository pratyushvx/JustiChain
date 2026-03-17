const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const Case = require("../models/Case");
const User = require("../models/User");
const CourtroomSession = require("../models/CourtroomSession");
const Evidence = require("../models/Evidence");

const router = express.Router();


// ================= GET ALL CASES =================
router.get("/cases", async (req, res) => {
  try {
    const cases = await Case.find()
      .populate("citizenId", "name email")
      .populate("lawyerId", "name email")
      .populate("policeId", "name email")
      .sort({ createdAt: -1 });

    res.json(cases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to load cases" });
  }
});


// ================= GET CASE SESSION (ADMIN REVIEW) =================
router.get("/case/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;

    const c = await Case.findOne({ caseId });

    if (!c) {
      return res.status(404).json({ msg: "Case not found" });
    }

    const session = await CourtroomSession.findOne({
      caseId: c._id,
      isActive: true
    });

    res.json({
      adminReview: session?.adminReview || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch session" });
  }
});


// ================= FINAL DECISION =================
router.post("/final-decision", async (req, res) => {
  try {

    const { caseId, decision, judgementText } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    const hearing = c.hearings.find(h => h.isOpen);

    if (!hearing)
      return res.status(400).json({ msg: "No active hearing" });

    hearing.judgeDecision = decision;
    hearing.judgementText = judgementText || "";
    hearing.isOpen = false;
    hearing.closedAt = new Date();

    const session = await CourtroomSession.findOne({
      caseId: c._id,
      isActive: true
    });

    if (session) {
      hearing.messages = session.statements.map(s => {

        const role =
          s.from ||
          s.sender ||
          s.role ||
          s.userRole ||
          "SYSTEM";

        return {
          sender: role.toUpperCase(),
          text: s.text || "",
          time: s.timestamp || new Date().toISOString()
        };

      });

      let verdict = "PENDING";

      if (decision === "WIN") verdict = "CITIZEN_WINS";
      if (decision === "LOSS") verdict = "OPPONENT_WINS";

      session.judgeFinalDecision = {
        verdict,
        remarks: judgementText,
        decidedAt: new Date()
      };

      session.isActive = false;

      await session.save();

      const io = req.app.get("io");

      if (io) {
        io.to(c.courtRoomId).emit(
          "JUDGE_FINAL_DECISION",
          session.judgeFinalDecision
        );
      }
    }

    if (decision === "NEXT_HEARING") {

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);

      c.hearings.push({
        hearingId: "HEARING_" + Date.now(),
        hearingDate: nextDate,
        isOpen: false
      });

      c.hearingDate = nextDate;
      c.status = "HEARING_SCHEDULED";
      c.courtroomOpen = false;

    } else {

      c.status = "CLOSED";
      c.courtroomOpen = false;
      c.hearingDate = null;

    }

    await c.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Final decision failed" });
  }
});


// ================= SCHEDULE HEARING =================
router.post("/schedule-hearing", async (req, res) => {

  try {

    const { caseId, hearingDate } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    if (["WIN", "LOSS", "CLOSED"].includes(c.status)) {
      return res.status(400).json({
        msg: "Final verdict already given"
      });
    }

    if (c.hearings.some(h => h.isOpen)) {
      return res.status(400).json({
        msg: "A hearing is already active"
      });
    }

    c.hearings.push({
      hearingId: "HEARING_" + Date.now(),
      hearingDate,
      isOpen: false
    });

    c.hearingDate = hearingDate;
    c.status = "HEARING_SCHEDULED";

    await c.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to schedule hearing" });
  }
});


// ================= VALIDATE OPPONENT =================
router.post("/validate-opponent", async (req, res) => {

  try {

    const { caseId, email } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    if (!c.courtroomOpen)
      return res.status(403).json({ msg: "Courtroom closed" });

    if (!c.opponent || c.opponent.email !== email)
      return res.status(403).json({ msg: "Unauthorized opponent" });

    const hearing = c.hearings.find(h => h.isOpen);

    if (!hearing)
      return res.status(403).json({ msg: "No active hearing" });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Validation failed" });
  }
});


// ================= COURTROOM CONTROL =================
router.post("/courtroom-control", async (req, res) => {

  try {

    const { caseId, open } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    if (["WIN", "LOSS", "CLOSED"].includes(c.status)) {
      return res.status(400).json({
        msg: "Case closed"
      });
    }

    if (open) {

      if (!c.hearings.length) {
        return res.status(400).json({
          msg: "Schedule hearing before opening courtroom"
        });
      }

      c.hearings.forEach(h => (h.isOpen = false));

      const hearing = c.hearings[c.hearings.length - 1];

      hearing.isOpen = true;
      hearing.courtRoomId = "COURT_" + Date.now();
      hearing.password = crypto.randomBytes(4).toString("hex");

      c.courtroomOpen = true;
      c.courtRoomId = hearing.courtRoomId;
      c.courtAccessPassword = hearing.password;

      await CourtroomSession.updateMany(
        { caseId: c._id, isActive: true },
        { isActive: false }
      );

      const evidenceDocs = await Evidence.find({ caseId: c.caseId });

      await CourtroomSession.create({
        caseId: c._id,
        isActive: true,
        evidenceSnapshot: evidenceDocs.map(e => ({
          evidenceId: e._id,
          title: e.fileName,
          authenticityScore: e.mlScores?.authenticityScore || 0,
          fileUrl: e.filePath?.replace(/\\/g, "/") || ""
        }))
      });

    } else {

      c.courtroomOpen = false;

    }

    await c.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Courtroom control failed" });
  }
});


// ================= POLICE LIST =================
router.get("/police-list", async (req, res) => {

  try {

    const policeUsers = await User.find({ role: "police" })
      .select("name email");

    res.json(policeUsers);

  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch police list" });
  }
});


// ================= ASSIGN POLICE =================
router.post("/assign-police", async (req, res) => {

  try {

    const { caseId, policeId } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    const police = await User.findOne({
      _id: policeId,
      role: "police"
    });

    if (!police)
      return res.status(404).json({ msg: "Police not found" });

    c.policeId = policeId;

    await c.save();

    res.json({
      success: true,
      police
    });

  } catch (err) {
    res.status(500).json({ msg: "Assign police failed" });
  }
});


// ================= ADD OPPONENT =================
router.post("/add-opponent", async (req, res) => {

  try {

    const { caseId, name, email } = req.body;

    const c = await Case.findOne({ caseId });

    if (!c) return res.status(404).json({ msg: "Case not found" });

    if (c.opponent?.email)
      return res.status(400).json({ msg: "Opponent already exists" });

    c.opponent = { name, email };

    await c.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ msg: "Failed to add opponent" });
  }
});


// ================= AI SUGGESTION =================
router.post("/ai-suggestion/:caseId", async (req, res) => {

  try {

    const { caseId } = req.params;

    const c = await Case.findOne({ caseId })
      .populate("lawyerId")
      .populate("opponentLawyer");

    if (!c) return res.status(404).json({ msg: "Case not found" });

    const hearingsHistory = c.hearings.map(h => ({
      hearingId: h.hearingId,
      hearingDate: h.hearingDate,
      messages: h.messages
    }));

    const session = await CourtroomSession.findOne({
      caseId: c._id,
      isActive: true
    });

    const statements = session?.statements || [];
    const evidenceSnapshot = session?.evidenceSnapshot || [];
    const adminReview = session?.adminReview || null;

    const evidenceDocs = await Evidence.find({ caseId: c.caseId });

    const evidenceForML = evidenceDocs.map(e => ({
      type: e.type || "document",
      description: e.description || e.fileName,
      verified: e.status === "VERIFIED",
      submitter: e.uploaderRole || "unknown"
    }));

    const payload = {

      caseId: c.caseId,
      citizenId: c.citizenId,
      opponent: c.opponent,
      policeId: c.policeId,

      hearings: hearingsHistory,
      messages: statements,

      evidence: evidenceForML,
      evidenceSnapshot,
      adminReview

    };

    const mlResponse = await axios.post(
      "http://localhost:8000/predict",
      payload
    );

    const mlData = mlResponse.data;

    const activeHearingIndex =
      c.hearings.findIndex(h => h.isOpen);

    const analysis = {

      timestamp: new Date(),
      hearingNumber: activeHearingIndex + 1,

      citizenCredibility: mlData.credibility_scores?.citizen,
      opponentCredibility: mlData.credibility_scores?.opponent,

      evidenceStrength: mlData.evidence_analysis?.strength,
      contradictionDetected:
        mlData.contradiction_analysis?.detected,

      winner: mlData.decision_fusion?.winner,
      explanation: mlData.decision_fusion?.explanation,

      aiSuggestion: mlData.ai_suggestion,
      fullResponse: mlData
    };

    c.mlAnalyses = c.mlAnalyses || [];
    c.mlAnalyses.push(analysis);

    await c.save();

    res.json({
      success: true,
      mlAnalysis: mlData
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "AI suggestion failed",
      error: err.message
    });
  }
});


module.exports = router;