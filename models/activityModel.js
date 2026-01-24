const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String }, // "Complaint", "User"
  meta: mongoose.Schema.Types.Mixed, // { complaintNumber: "1234", title: "...", assignedTo: "..." }
  role: String, // "CO", "MC", "AC", "DC"
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("Activity", activitySchema);
