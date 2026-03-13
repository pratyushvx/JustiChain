const express = require("express");
const auth = require("../middleware/auth");
const Case = require("../models/Case");
const LawyerRequest = require("../models/LawyerRequest");
const User = require("../models/User");
const axios = require("axios");

const router = express.Router();

/**
 * Utility Function: Generate Realistic Case ID
 * Format:
 * JC/<TYPE>/<PINCODE>/<YEAR>/<SERIAL>
 */
async function generateCaseId(caseType, pincode) {
  const year = new Date().getFullYear();
  const PINCODE = pincode;

  const normalizedType = caseType.trim().toLowerCase();

  const typeMap = {
    criminal: "CR",
    crime: "CR",
    civil: "CV",
    land: "LD",
    discrimination: "DS"
  };

  const typeCode = typeMap[normalizedType] || "OT";

  const count = await Case.countDocuments({
    caseType,
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`)
    }
  });

  const serial = String(count + 1).padStart(4, "0");

  return `JC-${typeCode}-${PINCODE}-${year}-${serial}`;
}

/**
 * Register case
 */
router.post("/register-case", auth, async (req, res) => {
  try {
    if (req.user.role !== "citizen")
      return res.status(403).json({ msg: "Access denied" });

    const { title, description, caseType, pincode } = req.body;

    if (!pincode)
      return res.status(400).json({ msg: "Pincode required" });

    // Generate realistic ordered case ID
    const caseId = await generateCaseId(caseType, pincode);

    const newCase = await Case.create({
      caseId,
      title,
      description,
      caseType,
      pincode,
      citizenId: req.user.id
    });

    res.json({ case: newCase });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * Get citizen cases WITH lawyer info
 */
router.get("/my-cases", auth, async (req, res) => {

  if (req.user.role !== "citizen")
    return res.status(403).json({ msg: "Access denied" });

  const cases = await Case.find({
    citizenId: req.user.id
  })
    .populate("lawyerId", "name email")
    .sort({ createdAt: -1 });

  res.json(cases);
});

/**
 * Enter courtroom (Citizen)
 */
router.post("/enter-case", auth, async (req, res) => {

  if (req.user.role !== "citizen")
    return res.status(403).json({ msg: "Access denied" });

  const { caseId } = req.body;

  const c = await Case.findOne({ caseId });

  if (!c)
    return res.status(404).json({ msg: "Case not found" });

  // Ensure citizen owns the case
  if (c.citizenId.toString() !== req.user.id)
    return res.status(403).json({ msg: "Unauthorized case access" });

  // Ensure courtroom is open
  if (!c.courtroomOpen || !c.courtRoomId)
    return res.status(403).json({ msg: "Courtroom not open" });

  res.json({
    success: true,
    courtRoomId: c.courtRoomId
  });
});

/**
 * Suggest lawyers for a case (only if not assigned)
 */
router.get("/suggest-lawyers/:caseId", auth, async (req, res) => {

  if (req.user.role !== "citizen")
    return res.status(403).json({ msg: "Access denied" });

  const { caseId } = req.params;

  const c = await Case.findOne({ caseId });

  if (!c)
    return res.status(404).json([]);

  if (c.lawyerId)
    return res.json([]);

  const lawyers = await User.find({
    role: "lawyer"
  }).select("name email");

  res.json(lawyers);
});

/**
 * Send lawyer request
 */
router.post("/send-lawyer-request", auth, async (req, res) => {

  if (req.user.role !== "citizen")
    return res.status(403).json({ msg: "Access denied" });

  const { caseId, lawyerId } = req.body;

  const exists = await LawyerRequest.findOne({
    caseId,
    lawyerId,
    citizenId: req.user.id
  });

  if (exists)
    return res.status(400).json({ msg: "Request already sent" });

  await LawyerRequest.create({
    caseId,
    lawyerId,
    citizenId: req.user.id
  });

  await Case.updateOne(
    { caseId },
    { status: "LAWYER_REQUESTED" }
  );

  res.json({ success: true });
});

/**
 * Predict case type using ML
 */
router.post("/predict-case-type", auth, async (req, res) => {
  try {

    if (req.user.role !== "citizen")
      return res.status(403).json({ msg: "Access denied" });

    const { description } = req.body;

    if (!description)
      return res.status(400).json({ msg: "Description required" });

    const mlResponse = await axios.post(
      "http://localhost:8000/predict_case_type",
      { text: description }
    );

    const predictedType = mlResponse.data.predictedType;
    const confidence = mlResponse.data.confidence;

    res.json({
      predictedType,
      confidence
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "ML prediction failed" });
  }
});

module.exports = router;