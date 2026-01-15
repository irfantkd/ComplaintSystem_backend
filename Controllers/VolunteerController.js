const Complaint = require("../models/complaintModel");
const Notification = require("../models/notificationModel");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const User = require("../models/usersModel");
const Role = require("../models/roleModels");
const zilaModel = require("../models/zilaModel");
const { getRoleId } = require("../utils/roleHelpers");
const Tehsil = require("../models/tehsilModel");

// const getRoleId = async (roleName) => {
//   const roleConfig = await Role.findOne();
//   if (!roleConfig) throw new Error("Role config not found");
//   const role = roleConfig.roles.find((r) => r.name === roleName);
//   if (!role) throw new Error(`Role "${roleName}" not found`);
//   return role._id.toString();
// };

const createComplaint = async (req, res) => {
  try {
    const USERId = req.user.id;
    console.log(USERId);

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
      mcId,
    } = req.body;

    // Find user
    const user = await User.findById(USERId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user has USER role
    const USERRoleId = await getRoleId("USER");
    console.log(USERRoleId);
    if (user.roleId.toString() !== USERRoleId) {
      return res.status(403).json({
        message: "Only USERs can create complaints",
      });
    }
    if (tehsilId) {
      const tehsil = await Tehsil.findById(tehsilId);
      if (!tehsil) {
        return res.status(404).json({ message: "Tehsil not found" });
      }
    }

    // Basic validations
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!areaType || !["Village", "City"].includes(areaType)) {
      return res.status(400).json({
        message: "Valid areaType is required (Village or City)",
      });
    }

    if (areaType === "Village" && !districtCouncilId) {
      return res.status(400).json({ message: "District council required" });
    }
    if (areaType === "City" && !mcId) {
      return res.status(400).json({ message: "MC required" });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Complaint image is required" });
    }

    // Cloudinary Upload (Buffer → Stream)
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

    // Create Complaint
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
      createdByVolunteerId: USERId,
      zilaId,
      mcId,
      tehsilId,
      districtCouncilId,
      status: "pending",
    });

    // ── Notification Logic ──────────────────────────────────────────────────────

    // Get required role IDs
    const [dcRoleId, acRoleId, mcCoRoleId, distCouncilOfficerRoleId] =
      await Promise.all([
        getRoleId("DC"),
        getRoleId("AC"),
        getRoleId("MC_CO"),
        getRoleId("DISTRICT_COUNCIL_OFFICER"),
      ]);

    // 1. DC(s) of the zila
    const dcUsers = await User.find({
      roleId: dcRoleId,
      zilaId,
    })
      .select("_id")
      .lean();

    // 2. AC(s) of the tehsil
    const acUsers = await User.find({
      roleId: acRoleId,
      tehsilId,
    })
      .select("_id")
      .lean();

    // 3. Area type specific primary officers
    let primaryOfficers = [];

    if (areaType === "City") {
      primaryOfficers = await User.find({
        roleId: mcCoRoleId,
        mcId, // most common case - adjust if you use mcId
      })
        .select("_id")
        .lean();
    } else if (areaType === "Village") {
      const query = districtCouncilId ? { districtCouncilId } : { zilaId };

      primaryOfficers = await User.find({
        roleId: distCouncilOfficerRoleId,
        ...query,
      })
        .select("_id")
        .lean();
    }

    // Combine all unique officer IDs
    const uniqueOfficerIds = [
      ...dcUsers.map((u) => u._id.toString()),
      ...acUsers.map((u) => u._id.toString()),
      ...primaryOfficers.map((u) => u._id.toString()),
    ];

    const finalOfficerIds = [...new Set(uniqueOfficerIds)].filter(Boolean);

    // Get socket.io instance
    const io = req.app.get("io");

    // ── Create persistent notifications in DB ───────────────────────────────
    const notifications = finalOfficerIds.map((userId) => ({
      userId,
      title: "A new complaint has been registered!",
      message: `A new complaint has been registered in the ${
        areaType === "City" ? "urban" : "rural"
      } area - ${locationName || "location"}`,
      complaintId: complaint._id,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // ── Send real-time notification via Socket.io ───────────────────────────
    if (io && finalOfficerIds.length > 0) {
      const notificationPayload = {
        title: "New Complaint Registered",
        message: `A new complaint has been registered in the ${
          areaType === "City" ? "urban" : "rural"
        } area - ${locationName || "location"}`,
        complaintId: complaint._id.toString(),
        areaType,
        locationName: locationName || "Unknown location",
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      finalOfficerIds.forEach((userId) => {
        io.to(userId).emit("new-complaint", notificationPayload);
      });

      console.log(
        `Real-time notification sent to ${finalOfficerIds.length} officers`
      );
    }

    // Get roleIds for notifications
    // const dcRoleId = await getRoleId("DC");
    // const acRoleId = await getRoleId("AC");
    // const mcCooRoleId = await getRoleId("MC_CO");

    // // Fetch officers using roleIds
    // const dcUsers = await User.find({ roleId: dcRoleId, zilaId });
    // const acUsers = await User.find({ roleId: acRoleId, tehsilId });
    // const mcCooUsers = await User.find({
    //   roleId: mcCooRoleId,
    //   $or: [{ tehsilId }, { districtCouncilId }],
    // });

    // const officersToNotify = [...dcUsers, ...acUsers, ...mcCooUsers];

    // // Create Notifications
    // const notifications = officersToNotify.map((officer) => ({
    //   userId: officer._id,
    //   title: "New Complaint Submitted",
    //   message: `A new complaint has been submitted in ${areaType} area (${locationName})`,
    //   complaintId: complaint._id,
    // }));

    // if (notifications.length > 0) {
    //   await Notification.insertMany(notifications);
    // }

    // Success response
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

const getComplainsOfUSER = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const complaints = await Complaint.find({
      createdByVolunteerId: user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getComplainOfUserById = async (req, res) => {
  try {
    const user = req.user;
    const { ComplaintId } = req.params;
    if (!user) {
      return res.status(400).json({ message: "Uer is not found" });
    }

    const complaint = await ComplaintById(ComplaintId);
    if (!complaint) {
      return res.status(400).json({ message: "Complaint not found" });
    }

    return res.status(200).json({
      message: "Successfully fetched complaint",
      complaint: complaint,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const USERId = req.user.id;
    const { title, description, categoryId } = req.body;

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Verify ownership
    if (complaint.createdByVolunteerId.toString() !== USERId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own complaints",
      });
    }

    // Only allow updates if status is pending
    if (complaint.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update complaint once it's been assigned",
      });
    }

    // Update fields
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (categoryId) complaint.categoryId = categoryId;

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete complaint (only if pending)
 */
const deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const USERId = req.user.id;

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Verify ownership
    if (complaint.createdByVolunteerId.toString() !== USERId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own complaints",
      });
    }

    // Only allow deletion if status is pending
    if (complaint.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete complaint once it's been assigned",
      });
    }

    await Complaint.findByIdAndDelete(complaintId);

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get USER notifications
 */
const getUSERNotifications = async (req, res) => {
  try {
    const USERId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ userId: USERId })
      .populate("complaintId", "title status")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments({ userId: USERId });
    const unreadCount = await Notification.countDocuments({
      userId: USERId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  getComplainsOfUSER,
  updateComplaint,
  deleteComplaint,
  getUSERNotifications,
  getComplainOfUserById,
};
