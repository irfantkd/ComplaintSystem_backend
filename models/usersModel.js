const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    role: {
      type: String,
      enum: ["DC", "AC", "MC", "FIELD", "VOLUNTEER"],
      required: true,
    },

    district: {
      type: String,
      default: "Lodhran",
    },

    tehsil: {
      type: String,
      enum: ["Lodhran", "Kahror Paka", "Dunyapur"],
      required: function () {
        return this.role !== "DC";
      },
    },

    phone: String,
    email: { type: String, unique: true },
    password: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
