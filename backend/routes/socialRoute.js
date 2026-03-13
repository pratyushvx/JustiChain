const express = require("express");
const router = express.Router();

const Case = require("../models/Case");   // ✅ correct model


router.get("/:caseId", async (req, res) => {

  try {

    const caseId = req.params.caseId;

    const caseData = await Case.findOne({ caseId });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }

    const hearings = caseData.hearings || [];

    let post = `⚖️ Justice Update\n\n`;

    post += `Case ID: ${caseId}\n`;
    post += `Title: ${caseData.title}\n`;
    post += `Type: ${caseData.caseType}\n\n`;

    hearings.forEach((h, i) => {

      post += `Hearing ${i + 1}: ${h.judgeDecision || "Pending"}\n`;

    });

    post += `\n#Justice #LegalAwareness #JustiChain`;

    res.json({ post });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: "Failed to generate social post" });

  }

});

module.exports = router;