const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const SECRET = "JUSTICHAIN_SECRET";


// 🔹 REGISTER
// 🔹 REGISTER (FIXED)
router.post("/register", async (req, res) => {
  let { name, email, password, role } = req.body;

  // ✅ Normalize role
  role = role?.toLowerCase();

  // ✅ Validate role
  if (!["citizen", "lawyer", "police"].includes(role)) {
    return res.status(400).json({ msg: "Invalid role" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ msg: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hashed,
    role
  });

  res.json({ msg: "User registered successfully" });
});

router.post("/admin-access", async (req, res) => {
  const { code } = req.body;

  // 🔐 SECRET JUDGE CODE
  const JUDGE_CODE = "1234";

  // Validate code
  if (!code || code !== JUDGE_CODE) {
    return res.status(401).json({ msg: "Invalid judge code" });
  }

  // ✅ No token, no cookie, no session
  // Just confirm the code is valid
  res.json({
    success: true,
    msg: "Judge code verified"
  });
});


// 🔹 LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ msg: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    SECRET,
    { expiresIn: "1d" }
  );

  // 🍪 SET COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax"
  });

  res.json({
    msg: "Login successful"
  });
});


// 🔹 WHO AM I (ROLE CHECK)  ✅ REQUIRED
router.get("/me", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ msg: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findById(decoded.id).select("name role salary");

    res.json({
      userId: user._id,
      name: user.name,
      role: user.role,
      salary: user.salary || 0
    });
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
});


// 🔹 LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ msg: "Logged out" });
});

module.exports = router;
