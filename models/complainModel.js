const complaintSchema = new mongoose.Schema(
  {
    title: String,
    description: String,

    images: {
      before: String,
      after: String,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        index: "2dsphere",
      },
    },

    locationName: String,

    category: String,

    from: {
      type: String,
      enum: ["village", "city"],
    },

    tehsil: String,

    status: {
      type: String,
      enum: [
        "submitted",
        "assigned",
        "in-progress",
        "resolved",
        "approved",
        "delayed",
      ],
      default: "submitted",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedAC: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedMC: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deadline: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
