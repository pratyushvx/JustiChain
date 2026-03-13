const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

router.get("/dashboard", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("name role");

  res.json({
    name: user.name,
    role: user.role
  });
});

module.exports = router;
