const Complaint = require("../models/complaintModel");
const Notification = require("../models/notificationModel");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const User = require("../models/usersModel");

const createComplaint = async (req, res) => {
  try {
    const volunteerId = req.user.id;

    const {
      title,
      description,
      categoryId,
      areaType,
      latitude,
      longitude,
      locationName,
      zilaId,
      tehsilId,
      districtCouncilId,
    } = req.body;

    // 🔐 Volunteer validation
    const user = await User.findById(volunteerId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "VOLUNTEER") {
      return res.status(403).json({
        message: "Only volunteers can create complaints",
      });
    }

    // ❗ Required validations
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!areaType || !["Village", "City"].includes(areaType)) {
      return res.status(400).json({
        message: "Valid areaType is required (Village or City)",
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Complaint image is required",
      });
    }

    // ☁️ Cloudinary Upload (Buffer → Stream)
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "complaints" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const uploadResult = await streamUpload(req.file.buffer);

    // 📝 Create Complaint
    const complaint = await Complaint.create({
      title,
      description,
      categoryId,
      images: uploadResult.secure_url,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      locationName,
      areaType,
      createdByVolunteerId: volunteerId,
      zilaId,
      tehsilId,
      districtCouncilId,
      status: "SUBMITTED",
    });

    // 🔔 FIND OFFICERS TO NOTIFY

    // DC (District level)
    const dcUsers = await User.find({
      role: "DC",
      zilaId,
    });

    // AC (Tehsil level)
    const acUsers = await User.find({
      role: "AC",
      tehsilId,
    });

    // MC COO (Municipal / District Council)
    const mcCooUsers = await User.find({
      role: "MC_COO",
      $or: [{ tehsilId }, { districtCouncilId }],
    });

    // Combine all officers
    const officersToNotify = [
      ...dcUsers,
      ...acUsers,
      ...mcCooUsers,
    ];

    // 🔔 Create Notifications
    const notifications = officersToNotify.map((officer) => ({
      userId: officer._id,
      title: "New Complaint Submitted",
      message: `A new complaint has been submitted in ${areaType} area (${locationName})`,
      complaintId: complaint._id,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // ✅ Final Response
    return res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });

  } catch (error) {
    console.error("Create Complaint Error:", error);
    return res.status(500).json({
      success: false,
      message: "Complaint creation failed",
      error: error.message,
    });
  }
};

module.exports = { createComplaint };
