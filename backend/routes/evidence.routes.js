const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const Evidence = require("../models/Evidence");
const Case = require("../models/Case");
const CourtroomSession = require("../models/CourtroomSession");
const mlService = require("../services/mlService");

const router = express.Router();

/* ================= STORAGE CONFIG ================= */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { caseId, type } = req.body;

        const safeCaseId = caseId || "uncategorized";
        const safeType = type ? type.toLowerCase() : "other";

        const dir = `uploads/cases/${safeCaseId}/${safeType}`;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                "-" +
                uniqueSuffix +
                path.extname(file.originalname)
        );
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* =======================================================
   UPLOAD EVIDENCE (Instant response, ML in background)
======================================================= */

router.post("/upload", auth, upload.single("file"), async (req, res) => {
    try {
        const { caseId, type, description } = req.body;

        if (!req.file && type !== "STATEMENT") {
            return res
                .status(400)
                .json({ msg: "File is required for this evidence type" });
        }

        const c = await Case.findOne({ caseId });
        if (!c) return res.status(404).json({ msg: "Case not found" });

        const newEvidence = await Evidence.create({
            caseId,
            uploadedBy: req.user.id,
            uploaderRole: req.user.role,
            type,
            description,
            filePath: req.file ? req.file.path : null,
            fileName: req.file ? req.file.originalname : null,
            extractedText:
                type === "STATEMENT" ? description : null,
            metadata: req.file
                ? {
                      mimeType: req.file.mimetype,
                      sizeKB: Math.round(req.file.size / 1024),
                  }
                : {},
            status: "ANALYZING",
            mlScores: {},
        });

        /* ===== ML RUNS IN BACKGROUND ===== */
        mlService
            .analyzeEvidence(newEvidence._id)
            .catch((err) =>
                console.error("Background ML Error:", err)
            );

        /* ===== RETURN IMMEDIATELY ===== */
        res.json({
            success: true,
            evidence: newEvidence,
        });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

/* =======================================================
   CLICK ACTION (Auto validation based on text length)
======================================================= */

router.post("/click-action", auth, async (req, res) => {
    try {
        const { evidenceId } = req.body;

        if (!evidenceId) {
            return res
                .status(400)
                .json({ msg: "evidenceId required" });
        }

        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return res
                .status(404)
                .json({ msg: "Evidence not found" });
        }

        const textContent =
            evidence.extractedText ||
            evidence.description ||
            "";

        let newStatus;
        let newScore;

        if (textContent.trim().length > 4) {
            newStatus = "VERIFIED_CORRECT";
            newScore = 0.95;
        } else {
            newStatus = "WRONG_DOCUMENT";
            newScore = 0.2;
        }

        const updatedEvidence =
            await Evidence.findByIdAndUpdate(
                evidenceId,
                {
                    $set: {
                        status: newStatus,
                        mlScores: {
                            ...(evidence.mlScores || {}),
                            authenticityScore: newScore,
                        },
                    },
                },
                { new: true }
            );

        res.json({
            success: true,
            evidence: updatedEvidence,
        });
    } catch (err) {
        console.error("Click Action Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

/* =======================================================
   GET EVIDENCE FOR CASE
======================================================= */

router.get("/:caseId", auth, async (req, res) => {
    try {
        const { caseId } = req.params;

        const evidenceList = await Evidence.find({
            caseId,
        })
            .sort({ createdAt: -1 })
            .populate("uploadedBy", "name role");

        const c = await Case.findOne({
            caseId,
        }).select("evidenceSummary");

        res.json({
            evidence: evidenceList,
            summary: c?.evidenceSummary || {},
        });
    } catch (err) {
        console.error("Fetch Evidence Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

module.exports = router;