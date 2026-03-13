const mongoose = require("mongoose");

const lawyerRequestSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true
  },

  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("LawyerRequest", lawyerRequestSchema);
