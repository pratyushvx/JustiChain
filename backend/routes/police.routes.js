const express = require("express");
const auth = require("../middleware/auth");
const Case = require("../models/Case");

const router = express.Router();

/**
 * 🔹 GET: Police Dashboard – My Assigned Cases
 */
router.get("/my-cases", auth, async (req, res) => {
  if (req.user.role !== "police") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const cases = await Case.find({
    policeId: req.user.id   // ✅ FIXED
  }).sort({ createdAt: -1 });

  res.json(cases);
});

/**
 * 🔹 POST: Self-Assign Case using Case ID
 */
router.post("/assign", auth, async (req, res) => {
  if (req.user.role !== "police") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const { caseId } = req.body;

  const c = await Case.findOne({ caseId });
  if (!c) return res.status(404).json({ msg: "Case not found" });

  if (c.policeId) {
    return res.status(400).json({ msg: "Case already assigned to police" });
  }

  c.policeId = req.user.id;          // ✅ FIXED
  c.status = "INVESTIGATION";

  await c.save();

  res.json({
    msg: "Case successfully assigned",
    caseId: c.caseId
  });
});

/**
 * 🏛️ ENTER COURTROOM (POLICE)
 */
router.post("/enter-case", auth, async (req, res) => {
  if (req.user.role !== "police") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const { caseId } = req.body;

  const c = await Case.findOne({ caseId });
  if (!c) return res.status(404).json({ msg: "Case not found" });

  if (String(c.policeId) !== String(req.user.id)) {
    return res.status(403).json({ msg: "Not assigned to this case" });
  }

  if (!c.courtroomOpen || !c.courtRoomId) {
    return res.status(403).json({ msg: "Courtroom not open" });
  }

  res.json({ success: true });
});

/**
 * 📝 ADD INVESTIGATION NOTE
 */
router.post("/add-note", auth, async (req, res) => {
  if (req.user.role !== "police") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const { caseId, note } = req.body;

  const c = await Case.findOne({ caseId });
  if (!c) return res.status(404).json({ msg: "Case not found" });

  if (String(c.policeId) !== String(req.user.id)) {
    return res.status(403).json({ msg: "Not authorized" });
  }

  c.investigationNotes.push({ note });
  await c.save();

  res.json({ msg: "Investigation note added" });
});

module.exports = router;
