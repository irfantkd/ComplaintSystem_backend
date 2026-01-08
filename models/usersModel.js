const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  username: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  phone:{
    type:String
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
// Virtual to populate role name easily
userSchema.virtual("role", {
  ref: "Role",
  localField: "roleId",
  foreignField: "roles._id",
  justOne: true,
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
