const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

// Prefix: /api/admin

router.get("/case/:caseId", adminController.getCaseSession);
router.post("/case/:caseId/review", adminController.submitReview);

module.exports = router;
