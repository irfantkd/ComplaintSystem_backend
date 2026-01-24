const Complaint = require("../../models/complaintModel");
const cloudinary = require("../../config/cloudinaryConfig");
const streamifier = require("streamifier");
const { logActivity } = require("../../utils/activityLogger");

// ========================================
// 1. Get All Assigned Complaints
// ========================================
const mongoose = require("mongoose"); // Make sure this is imported at the top

const getAssignedComplaints = async (req, res) => {
  try {
    const employeeId = req.user._id; // From auth middleware
    const { status, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    // Build filter with ObjectId conversion
    const filter = {
      assignedToUserId: new mongoose.Types.ObjectId(employeeId), // ← Convert to ObjectId
    };

    if (status && status !== "ALL") {
      filter.status = status;
    }

    // Check total complaints assigned to this user
    const totalAssigned = await Complaint.countDocuments({
      assignedToUserId: new mongoose.Types.ObjectId(employeeId),
    });

    // If no complaints, check what's in the database
    if (totalAssigned === 0) {
      const sampleWithAssignment = await Complaint.find({
        assignedToUserId: { $exists: true, $ne: null },
      })
        .limit(3)
        .select("assignedToUserId status title");
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch complaints
    const complaints = await Complaint.find(filter)
      .populate("categoryId", "name")
      .populate("createdByVolunteerId", "name email phone")
      .populate("zilaId", "name")
      .populate("tehsilId", "name")
      .populate("districtCouncilId", "name")
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Total count for pagination
    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Assigned complaints fetched successfully",
      data: {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAssignedComplaints:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assigned complaints",
      error: error.message,
    });
  }
};

// ========================================
// 2. Get Single Complaint Details
// ========================================
const getComplaintDetails = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { id } = req.params;

    const complaint = await Complaint.findOne({
      _id: id,
      assignedToUserId: employeeId,
    })
      .populate("categoryId", "name description")
      .populate("createdByVolunteerId", "name email phone")
      .populate("zilaId", "name")
      .populate("tehsilId", "name")
      .populate("districtCouncilId", "name")
      .populate("assignedToUserId", "name email phone");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not assigned to you",
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint details fetched successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching complaint details",
      error: error.message,
    });
  }
};

// ========================================
// 3. Upload Resolution Image
// ========================================
const submitResolutionWithImage = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { id } = req.params;
    const { resolutionNote, latitude, longitude } = req.body;

    // Validate image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resolution image is required",
      });
    }

    // Find complaint
    const complaint = await Complaint.findOne({
      _id: id,
      assignedToUserId: employeeId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not assigned to you",
      });
    }

    // Validate inputs
    if (!resolutionNote || resolutionNote.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Resolution note is required",
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location (latitude and longitude) is required",
      });
    }

    // ☁️ Upload image to Cloudinary
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "complaints/resolutions" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          },
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const uploadResult = await streamUpload(req.file.buffer);

    if (!uploadResult || !uploadResult.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to Cloudinary",
      });
    }

    // Update complaint - all at once
    complaint.resolutionImage = uploadResult.secure_url;
    complaint.resolutionNote = resolutionNote;
    complaint.status = "resolveByEmployee";
    complaint.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    };

    await complaint.save();
    await logActivity({
      action: "resolved complaint by employee",
      performedBy: req.user._id,
      targetId: complaint._id,
      targetType: "Complaint",
      meta: {
        title: complaint.title,
        complaintId: complaint._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Complaint resolved successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting resolution",
      error: error.message,
    });
  }
};

// ========================================
// 5. Get Employee Dashboard Statistics
// ========================================
const getEmployeeStats = async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Get counts for different statuses
    const [
      totalAssigned,
      pending,
      inProgress,
      resolvedByEmployee,
      resolved,
      completed,
      delayed,
      unseenCount,
    ] = await Promise.all([
      Complaint.countDocuments({ assignedToUserId: employeeId }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "pending",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "progress",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "resolveByEmployee",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "resolved",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "completed",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        status: "delayed",
      }),
      Complaint.countDocuments({
        assignedToUserId: employeeId,
        seen: false,
      }),
    ]);

    // Get recent complaints (last 5)
    const recentComplaints = await Complaint.find({
      assignedToUserId: employeeId,
    })
      .populate("categoryId", "name")
      .sort("-createdAt")
      .limit(5)
      .select("title status createdAt categoryId locationName");

    res.status(200).json({
      success: true,
      message: "Employee statistics fetched successfully",
      data: {
        stats: {
          totalAssigned,
          pending,
          inProgress,
          resolvedByEmployee,
          resolved,
          completed,
          delayed,
          unseenCount,
        },
        recentComplaints,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employee statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getAssignedComplaints,
  getComplaintDetails,
  submitResolutionWithImage,
  getEmployeeStats,
};
