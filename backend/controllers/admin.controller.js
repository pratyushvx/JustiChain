const CourtroomSession = require("../models/CourtroomSession");
const Case = require("../models/Case");
const Evidence = require("../models/Evidence");

exports.getCaseSession = async (req, res) => {
    try {
        const { caseId } = req.params;

        // 1. Resolve Case String ID -> ObjectId
        const distinctCase = await Case.findOne({ caseId: caseId });
        if (!distinctCase) return res.status(404).json({ msg: "Case not found" });

        // 2. Find active session using ObjectId
        let session = await CourtroomSession.findOne({ caseId: distinctCase._id, isActive: true })
            .populate("evidenceSnapshot.evidenceId");

        if (!session) {
            // Create a new session if not exists? Or just return empty?
            // For simplicity, let's create one if the courtroom is marked open in Case
            if (distinctCase.courtroomOpen) {
                session = new CourtroomSession({
                    caseId: distinctCase._id,
                    evidenceSnapshot: [] // Populate this initially?
                });

                // Pre-fill evidence
                const existingEvidence = await Evidence.find({ caseId: caseId });
                session.evidenceSnapshot = existingEvidence.map(e => ({
                    evidenceId: e._id,
                    title: e.fileName,
                    authenticityScore: e.mlScores ? e.mlScores.authenticityScore : 0,
                    fileUrl: e.filePath ? e.filePath.replace(/\\/g, "/") : ""
                }));

                await session.save();
            } else {
                return res.status(400).json({ msg: "Courtroom is not open" });
            }
        }

        res.json(session);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

exports.submitReview = async (req, res) => {
    try {
        const { caseId } = req.params; // potentially the string caseId
        const { decision, remarks } = req.body;

        // We need the database _id of the case to find the session
        const caseData = await Case.findOne({ caseId });
        if (!caseData) return res.status(404).json({ msg: "Case not found" });

        let session = await CourtroomSession.findOne({ caseId: caseData._id, isActive: true });
        if (!session) return res.status(404).json({ msg: "Active session not found" });

        session.adminReview = {
            decision,
            remarks,
            reviewedAt: new Date()
        };

        await session.save();

        // Socket Emit
        const io = req.app.get("io");
        if (io) {
            io.to(caseData.courtRoomId).emit("ADMIN_REVIEW_UPDATE", session.adminReview);
        }

        res.json(session);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
