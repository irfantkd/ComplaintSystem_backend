const taskHistorySchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
  },

  action: String, // Assigned, Resolved, Approved, Escalated

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  remark: String,

  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaskHistory", taskHistorySchema);
