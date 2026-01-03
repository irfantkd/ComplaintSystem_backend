const mongoose = require('mongoose')

const mcSchema = new mongoose.Schema({
  name: { type: String, required: true },

  tehsilId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tehsil",
    required: true,
  },

  cooId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // role = MC_COO
  },

  employeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // role = MC_EMPLOYEE
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MC", mcSchema);
