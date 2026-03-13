const express = require("express");
const auth = require("../middleware/auth");
const Case = require("../models/Case");
const LawyerRequest = require("../models/LawyerRequest");
const User = require("../models/User");

const router = express.Router();

// 🔒 Lawyer only middleware
const lawyerOnly = (req, res, next) => {
  if (req.user.role !== "lawyer") {
    return res.status(403).json({ msg: "Lawyer access only" });
  }
  next();
};

/**
 * 📩 GET PENDING REQUESTS
 */
router.get("/requests", auth, lawyerOnly, async (req, res) => {
  try {
    const requests = await LawyerRequest.find({
      lawyerId: req.user.id,
      status: "PENDING"
    }).populate("citizenId", "name email");

    res.json(requests);
  } catch (err) {
    console.error("Load requests error:", err);
    res.status(500).json([]);
  }
});

/**
 * ✅ ACCEPT REQUEST
 */
router.post("/accept-request", auth, lawyerOnly, async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await LawyerRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ msg: "Request already processed" });
    }

    const c = await Case.findOne({ caseId: request.caseId });
    if (!c) {
      return res.status(404).json({ msg: "Case not found" });
    }

    // assign lawyer to case
    c.lawyerId = req.user.id;
    c.status = "LAWYER_ASSIGNED";
    await c.save();

    // reject all other requests for same case
    await LawyerRequest.updateMany(
      { caseId: c.caseId },
      { status: "REJECTED" }
    );

    // mark this request accepted
    request.status = "ACCEPTED";
    await request.save();

    // Increment lawyer salary
    await User.findByIdAndUpdate(req.user.id, { $inc: { salary: 10000 } });

    res.json({ success: true });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ❌ REJECT REQUEST
 */
router.post("/reject-request", auth, lawyerOnly, async (req, res) => {
  try {
    const { requestId } = req.body;

    await LawyerRequest.updateOne(
      { _id: requestId },
      { status: "REJECTED" }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * 📂 GET LAWYER CASES
 */
router.get("/my-cases", auth, lawyerOnly, async (req, res) => {
  try {
    const cases = await Case.find({
      lawyerId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(cases);
  } catch (err) {
    console.error("Load lawyer cases error:", err);
    res.status(500).json([]);
  }
});

/**
 * 🏛️ ENTER COURTROOM
 */
router.post("/enter-case", auth, lawyerOnly, async (req, res) => {
  const { caseId } = req.body;

  const c = await Case.findOne({ caseId });
  if (!c) return res.status(404).json({ msg: "Case not found" });

  if (c.lawyerId?.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not your case" });
  }

  res.json({ ok: true });
});

module.exports = router;
