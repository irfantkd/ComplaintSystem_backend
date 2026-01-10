const Complaint = require("../models/complaintModel");
const Notification = require("../models/notificationModel");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const User = require("../models/usersModel");
const Role = require("../models/roleModels");

/**
 * Helper: Get roleId by role name
 */
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role config not found");
  const role = roleConfig.roles.find((r) => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

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

    // 🔐 Volunteer validation using roleId
    const user = await User.findById(volunteerId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const volunteerRoleId = await getRoleId("VOLUNTEER");
    if (user.roleId.toString() !== volunteerRoleId) {
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
      return res.status(400).json({ message: "Complaint image is required" });
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
      status: "pending",
    });

    // 🔔 Get roleIds for notifications
    const dcRoleId = await getRoleId("DC");
    const acRoleId = await getRoleId("AC");
    const mcCooRoleId = await getRoleId("MC_COO");

    // 🔔 Fetch officers using roleIds
    const dcUsers = await User.find({ roleId: dcRoleId, zilaId });
    const acUsers = await User.find({ roleId: acRoleId, tehsilId });
    const mcCooUsers = await User.find({
      roleId: mcCooRoleId,
      $or: [{ tehsilId }, { districtCouncilId }],
    });

    const officersToNotify = [...dcUsers, ...acUsers, ...mcCooUsers];

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

    // ✅ Response
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

const getComplaintForVolunteer = async (req, res) => {
  try {
    const volunteerUser = req.user;
    const volunteerRoleId = await getRoleId("VOLUNTEER");
    if (volunteerUser.roleId.toString() !== volunteerRoleId) {
      return res.status(403).json({
        message: "Only volunteers can fetch their complaints",
      });
    }
    const complaints = await Complaint.find({
      createdByVolunteerId: volunteerUser._id,
    });
    return res.status(200).json({
      success: true,
      message: "Complaints fetched successfully",
      data: complaints,
    });
  } catch (error) {
    console.error("Error fetching complaints for volunteer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
module.exports = { createComplaint, getComplaintForVolunteer };
