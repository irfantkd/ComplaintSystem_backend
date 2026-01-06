const mongoose = require('mongoose')

const zilaSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("Zila", zilaSchema);
