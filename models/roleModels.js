const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roles: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Role ||
  mongoose.model("Role", roleSchema);
