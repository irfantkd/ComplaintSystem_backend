const mongoose = require('mongoose')

const complaintSchema = new mongoose.Schema({
  title: String,

  description: { type: String, required: true },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ComplaintCategory",
  },

  images: String,

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },

  locationName: String,

  areaType: {
    type: String,
    enum: ["Village", "City"],
    required: true,
  },

  createdByVolunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  zilaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zila",
  },

  tehsilId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tehsil",
  },

  districtCouncilId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DistrictCouncil",
  },

  assignedToRole: String,

  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  seen:{
    type: Boolean,
    default: false
  },

  status: {
    type: String,
    enum: [
      "pending",
      "progress",
      "resolveByEmployee",
      "resolved",
      "completed",
      "closed",
      "delayed",
      "rejected",
    ],
    default: "pending",
  },

  deadline: Date,

  resolutionImage: String,
  resolutionNote: String,


},{
    timestamps: true, // ← Correct place: second argument (options)
  }
);

complaintSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Complaint", complaintSchema);
