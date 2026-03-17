const express = require("express");
const router = express.Router();
const Case = require("../models/Case");

router.get("/:caseId", async (req, res) => {
  try {
    const caseId = req.params.caseId;

    const caseData = await Case.findOne({ caseId });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }

    const hearings = caseData.hearings || [];

    // 🔥 Build Post
    let post = `⚖️ Justice in Progress\n\n`;

    post += `📌 Case: ${caseData.title}\n`;
    post += `🆔 ID: ${caseId}\n`;
    post += `📂 Type: ${caseData.caseType}\n\n`;

    post += `🧑‍⚖️ Court Updates:\n`;

    if (hearings.length === 0) {
      post += `No hearings yet. Stay tuned.\n`;
    } else {
      hearings.forEach((h, i) => {
        post += `➡️ Hearing ${i + 1}: ${h.judgeDecision || "⏳ Pending"
          }\n`;
      });
    }

    // 🔥 Summary
    let summary = "";
    const lastDecision = hearings[hearings.length - 1]?.judgeDecision;

    if (!lastDecision) {
      summary = "The case is still ongoing. Justice is yet to be served.";
    } else if (lastDecision.toLowerCase().includes("guilty")) {
      summary = "The court has taken a strong stand towards justice.";
    } else if (lastDecision.toLowerCase().includes("not guilty")) {
      summary = "The court has ruled in favor of the accused.";
    } else {
      summary = "The case is progressing with critical developments.";
    }

    post += `\n🧠 Summary: ${summary}\n\n`;
    post += `💬 What do you think?\n👇 Share below\n\n`;

    // 🔥 Hashtags
    const hashtags = [
      "Justice",
      "LegalAwareness",
      "CourtCase",
      "JustiChain",
      caseData.caseType?.replace(/\s+/g, "") || "Law"
    ];

    // 🔥 Limit for X (important)
    let tweetText =
      post.length > 260 ? post.slice(0, 260) + "..." : post;

    // 🔥 Encode
    const encodedText = encodeURIComponent(tweetText);

    // 🔥 Optional case link
    const caseLink = `http://localhost:3000/case/${caseId}`;

    // 🔥 X share URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${caseLink}&hashtags=${hashtags.join(",")}`;

    // 🔥 Gmail link
    const subject = `Case Update - ${caseData.title}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(post)}`;

    res.json({
      post,
      short: tweetText,
      twitterUrl,
      gmailUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;