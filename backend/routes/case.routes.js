const express = require("express");
const Case = require("../models/Case");
const router = express.Router();

/* 📜 GET HEARING HISTORY */
router.get("/hearings/:caseId", async (req, res) => {
  const { caseId } = req.params;

  const c = await Case.findOne({ caseId });
  if (!c) return res.status(404).json([]);

  const hearings = c.hearings.sort(
    (a, b) => new Date(a.hearingDate) - new Date(b.hearingDate)
  );

  res.json(hearings);
});

module.exports = router;
