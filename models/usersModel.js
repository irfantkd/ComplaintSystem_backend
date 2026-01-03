const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  username: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: [
      "DC",
      "DISTRICT_COUNCIL_OFFICER",
      "AC",
      "MC_COO",
      "MC_EMPLOYEE",
      "VOLUNTEER",
    ],
    required: true,
  },

  zilaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zila",
  },

  tehsilId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tehsil",
  },

  mcId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MC",
  },

  isActive: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
