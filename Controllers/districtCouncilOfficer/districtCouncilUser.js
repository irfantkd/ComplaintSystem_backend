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
const getComplaintsForDCO = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const baseQuery = { areaType: "Village" };
      const filterQuery = { ...baseQuery };

      if (req.query.status) filterQuery.status = req.query.status;
      if (req.query.categoryId) filterQuery.categoryId = req.query.categoryId;

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.trim(), "i");
        filterQuery.$or = [
          { title: searchRegex },
          { description: searchRegex },
        ];
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const populateOptions = [
        { path: "categoryId", select: "name" },
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
        { path: "districtCouncilId", select: "name" },
        { path: "assignedToUserId", select: "name phone" },
      ];

      const result = await paginate({
        query: filterQuery,
        model: complaint,
        page,
        limit,
        sort: { createdAt: -1 },
        populate: populateOptions,
      });

      return res.status(200).json({
        success: true,
        message: "Complaints fetched successfully",
        requestedBy: {
          userId: req.user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
        ...result,
      });
    });
  } catch (error) {
    console.error("Error in getComplaintsForDCO:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 2️⃣ Get all District Council Employees (for assigning tasks)
const getUserForDco = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const employeeRoleId = await getRoleId("DISTRICT_COUNCIL_EMPLOYEE");

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
        select: "name username phone zilaId tehsilId mcId",
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
      complaintDoc.status = "Assigned"; // or "In Progress" as per your flow
      complaintDoc.assignedAt = new Date();

      await complaintDoc.save();

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

// 4️⃣ DCO can mark complaint as Completed
const completeComplaintByDCO = async (req, res) => {
  try {
    await checkIsDistrictCouncilOfficer(req, res, async () => {
      const { complaintId } = req.body;

      if (!complaintId) {
        return res.status(400).json({
          success: false,
          message: "complaintId is required",
        });
      }

      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "Village",
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found or not under District Council",
        });
      }

      if (complaintDoc.status === "Completed") {
        return res.status(400).json({
          success: false,
          message: "Complaint is already marked as completed",
        });
      }

      complaintDoc.status = "Completed";
      complaintDoc.completedAt = new Date();
      complaintDoc.completedBy = req.user._id; // optional: track who completed

      await complaintDoc.save();

      return res.status(200).json({
        success: true,
        message: "Complaint marked as Completed",
        requestedBy: {
          userId: req.user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in completeComplaintByDCO:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getComplaintsForDCO,
  getUserForDco,
  assignTaskToEmployee,
  completeComplaintByDCO,
  checkIsDistrictCouncilOfficer, // export if you want to use as middleware in routes
};
