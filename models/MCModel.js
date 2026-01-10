const mongoose = require("mongoose");

const mcSchema = new mongoose.Schema({
  name: { type: String, required: true },

  tehsilId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tehsil",
    required: true,
  },

  cooId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // role = MC_CO
  },

  employeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // role = MC_EMPLOYEE
    },
  ],
  zilaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zila",
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
});

// module.exports = mongoose.model("MC", mcSchema);
module.exports = mongoose.models.MC || mongoose.model("MC", mcSchema);
