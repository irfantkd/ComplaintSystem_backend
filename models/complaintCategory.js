const mongoose = require('mongoose')

const complaintCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model(
  "ComplaintCategory",
  complaintCategorySchema
);
