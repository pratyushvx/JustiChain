const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["citizen", "lawyer", "police"],
    default: "citizen"
  },
  salary: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("User", userSchema);
