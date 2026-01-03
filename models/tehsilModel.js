const mongoose = require('mongoose')

const tehsilSchema = new mongoose.Schema({
  name: { type: String, required: true },

  zilaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zila",
    required: true,
  },

  acId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // role = AC
  },

  mcId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MC",
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tehsil", tehsilSchema);
