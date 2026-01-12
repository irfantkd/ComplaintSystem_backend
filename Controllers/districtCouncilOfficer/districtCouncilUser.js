const complaint = require("../../models/complaintModel");
const User = require("../../models/usersModel");
const Role = require("../../models/roleModels");
const { paginate } = require("../../utils/pagination");

// Helper: Get sub-role _id by name
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role configuration not found");

  const role = roleConfig.roles.find((r) => r.name === roleName && r.isActive);
  if (!role) throw new Error(`Role "${roleName}" not found or inactive`);
  return role._id.toString();
};

// Middleware-style role check (can be used directly in routes or as separate middleware)
const checkIsDistrictCouncilOfficer = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const user = await User.findById(req.user._id).select("roleId");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const dcoRoleId = await getRoleId("DISTRICT_COUNCIL_OFFICER");
    if (user.roleId.toString() !== dcoRoleId) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Only District Council Officer can perform this action",
      });
    }

    // Attach user role name for convenience (optional)
    req.user.roleName = "DISTRICT_COUNCIL_OFFICER";
    next();
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying role",
      error: error.message,
    });
  }
};

// 1️⃣ Get Complaints for DCO (Village area only)
// const getComplaintsForDCO = async (req, res) => {
//   try {
//     await checkIsDistrictCouncilOfficer(req, res, async () => {
//       const baseQuery = { areaType: "Village" };
//       const filterQuery = { ...baseQuery };

//       if (req.query.status) filterQuery.status = req.query.status;
//       if (req.query.categoryId) filterQuery.categoryId = req.query.categoryId;

//       if (req.query.search) {
//         const searchRegex = new RegExp(req.query.search.trim(), "i");
//         filterQuery.$or = [
//           { title: searchRegex },
//           { description: searchRegex },
//         ];
//       }

//       const page = parseInt(req.query.page) || 1;
//       const limit = parseInt(req.query.limit) || 10;

//       const populateOptions = [
//         { path: "categoryId", select: "name" },
//         { path: "createdByVolunteerId", select: "name phone" },
//         { path: "zilaId", select: "name" },
//         { path: "tehsilId", select: "name" },
//         { path: "districtCouncilId", select: "name" },
//         { path: "assignedToUserId", select: "name phone" },
//       ];

//       const result = await paginate({
//         query: filterQuery,
//         model: complaint,
//         page,
//         limit,
//         sort: { createdAt: -1 },
//         populate: populateOptions,
//       });

//       return res.status(200).json({
//         success: true,
//         message: "Complaints fetched successfully",
//         requestedBy: {
//           userId: req.user._id,
//           role: "DISTRICT_COUNCIL_OFFICER",
//         },
//         ...result,
//       });
//     });
//   } catch (error) {
//     console.error("Error in getComplaintsForDCO:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// 2️⃣ Get all District Council Employees (for assigning tasks)
const getUserForDco = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const employeeRoleId = await getRoleId("DISTRICT_COUNCIL_OFFICER");
      console.log(employeeRoleId);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await paginate({
        query: {
          roleId: employeeRoleId,
          isActive: true,
        },
        model: User,
        page,
        limit,
        sort: { createdAt: -1 },
        select: "name username phone zilaId mcId",
        populate: [
          { path: "zilaId", select: "name" },
          { path: "tehsilId", select: "name" },
          { path: "mcId", select: "name" },
        ],
      });

      return res.status(200).json({
        success: true,
        message: "District Council Employees fetched successfully",
        requestedBy: {
          userId: req.user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
        ...result,
      });
    });
  } catch (error) {
    console.error("Error in getUserForDco:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 3️⃣ Assign Task to Employee
const assignTaskToEmployee = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const { complaintId, employeeUserId } = req.body;

      if (!complaintId || !employeeUserId) {
        return res.status(400).json({
          success: false,
          message: "complaintId and employeeUserId are required",
        });
      }

      // Check complaint is in Village area
      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "Village",
      });
      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Complaint not found or not under District Council jurisdiction",
        });
      }

      // Validate employee
      const employeeRoleId = await getRoleId("DISTRICT_COUNCIL_EMPLOYEE");
      const employee = await User.findOne({
        _id: employeeUserId,
        roleId: employeeRoleId,
        isActive: true,
      });

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive District Council Employee",
        });
      }

      // Assign
      complaintDoc.assignedToUserId = employeeUserId;
      complaintDoc.status = "progress";
      complaintDoc.assignedAt = new Date();

      //notification
      const notification = new Notification({
        userId: employeeUserId,
        title: "New Task Assigned",
        message: `You have been assigned a new task: ${complaintDoc.title}`,
        complaintId: complaintDoc._id,
      });

      await Promise.all([complaintDoc.save(), notification.save()]);

      await complaintDoc.populate("assignedToUserId", "name phone");

      return res.status(200).json({
        success: true,
        message: "Task assigned successfully to employee",
        requestedBy: {
          userId: req.user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in assignTaskToEmployee:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 4️⃣ DCO can update complaint status to ANY valid status
const updateComplaintStatus = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const { complaintId, status, note } = req.body;

      // Validation
      if (!complaintId || !status) {
        return res.status(400).json({
          success: false,
          message: "complaintId and status are required",
        });
      }

      const validStatuses = [
        "pending",
        "progress",
        "resolved",
        "completed",
        "closed",
        "delayed",
        "rejected",
        "resolveByEmployee",
      ];

      if (!validStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${validStatuses.join(", ")}`,
        });
      }

      // Find complaint under DCO jurisdiction
      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "Village",
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Complaint not found or not under District Council jurisdiction",
        });
      }

      // Prevent unnecessary update
      if (complaintDoc.status === status.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Complaint is already in "${status}" status`,
        });
      }

      // Update status
      complaintDoc.status = status.toLowerCase();
      complaintDoc.updatedBy = req.user._id; // track who changed it

      // Special fields for certain statuses
      if (
        ["completed", "resolved", "closed", "resolveByEmployee"].includes(
          status.toLowerCase()
        )
      ) {
        complaintDoc.completedAt = new Date();
        complaintDoc.completedBy = req.user._id;
      }

      // Optional note (e.g., reason for rejection or delay)
      if (note && note.trim()) {
        complaintDoc.resolutionNote = note.trim();
      }

      await complaintDoc.save();

      // Populate useful fields for response
      await complaintDoc.populate([
        { path: "assignedToUserId", select: "name phone" },
        { path: "createdByVolunteerId", select: "name phone" },
      ]);

      return res.status(200).json({
        success: true,
        message: `Complaint status updated to "${status}" successfully`,
        requestedBy: {
          userId: req.user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in updateComplaintStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getUserForDco,
  assignTaskToEmployee,
  updateComplaintStatus,
};
