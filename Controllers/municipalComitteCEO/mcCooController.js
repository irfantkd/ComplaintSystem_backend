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


const checkIsMcCoo = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const user = await User.findById(req.user._id).select("roleId tehsilId");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const mcCooRoleId = await getRoleId("MC_CO");
    if (user.roleId.toString() !== mcCooRoleId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only MC COO can perform this action",
      });
    }

    // Attach tehsilId for use in queries
    req.mcCooTehsilId = user.tehsilId;
    req.user.roleName = "MC_COO";
    next();
  } catch (error) {
    console.error("Role check error (MC_COO):", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying role",
      error: error.message,
    });
  }
};


const getComplaintsForMcCoo = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const baseQuery = {
        areaType: "City",
        tehsilId: req.mcCooTehsilId, 
      };

      const filterQuery = { ...baseQuery };

      if (req.query.status) filterQuery.status = req.query.status;
      if (req.query.category) {
        const categoryRegex = new RegExp(req.query.category.trim(), "i");
        filterQuery.category = categoryRegex;
      }
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
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
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
          role: "MC_COO",
          tehsilId: req.mcCooTehsilId,
        },
        ...result,
      });
    });
  } catch (error) {
    console.error("Error in getComplaintsForMcCoo:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const getMcEmployees = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const employeeRoleId = await getRoleId("MC_EMPLOYEE");

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await paginate({
        query: {
          roleId: employeeRoleId,
          tehsilId: req.mcCooTehsilId, 
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
        message: "MC Employees fetched successfully",
        requestedBy: {
          userId: req.user._id,
          role: "MC_COO",
        },
        ...result,
      });
    });
  } catch (error) {
    console.error("Error in getMcEmployees:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 3. Assign Task to MC Employee
const assignTaskToMcEmployee = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const { complaintId, employeeUserId } = req.body;

      if (!complaintId || !employeeUserId) {
        return res.status(400).json({
          success: false,
          message: "complaintId and employeeUserId are required",
        });
      }

      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "City",
        tehsilId: req.mcCooTehsilId,
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found or not under this MC jurisdiction",
        });
      }

      const employeeRoleId = await getRoleId("MC_EMPLOYEE");
      const employee = await User.findOne({
        _id: employeeUserId,
        roleId: employeeRoleId,
        tehsilId: req.mcCooTehsilId,
        isActive: true,
      });

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive MC Employee",
        });
      }

      complaintDoc.assignedToUserId = employeeUserId;
      complaintDoc.status = "progress";
      complaintDoc.assignedAt = new Date();

      await complaintDoc.save();
      await complaintDoc.populate("assignedToUserId", "name phone");

      return res.status(200).json({
        success: true,
        message: "Task assigned successfully to MC employee",
        requestedBy: {
          userId: req.user._id,
          role: "MC_COO",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in assignTaskToMcEmployee:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 4. Update Complaint Status (Dynamic - any valid status)
const approveComplaintByMcCoo = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const { complaintId, note } = req.body;

      if (!complaintId) {
        return res.status(400).json({
          success: false,
          message: "complaintId is required",
        });
      }

      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "City",
        tehsilId: req.mcCooTehsilId,
        status: "resolveByEmployee", 
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Complaint not found, not under this MC, or not eligible for approval",
        });
      }

      complaintDoc.status = "resolved";
      complaintDoc.updatedBy = req.user._id;
      complaintDoc.completedAt = new Date();
      complaintDoc.completedBy = req.user._id;

      if (note && note.trim()) {
        complaintDoc.resolutionNote = note.trim();
      }

      await complaintDoc.save();
      await complaintDoc.populate("assignedToUserId", "name phone");

      return res.status(200).json({
        success: true,
        message: "Complaint approved and marked as resolved",
        requestedBy: {
          userId: req.user._id,
          role: "MC_COO",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in approveComplaintByMcCoo:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const rejectComplaintByMcCoo = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const { complaintId, note } = req.body;

      if (!complaintId) {
        return res.status(400).json({
          success: false,
          message: "complaintId is required",
        });
      }

      const complaintDoc = await complaint.findOne({
        _id: complaintId,
        areaType: "City",
        tehsilId: req.mcCooTehsilId,
        status: "resolveByEmployee", // 🔐 strict check
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Complaint not found, not under this MC, or not eligible for rejection",
        });
      }

      complaintDoc.status = "rejected";
      complaintDoc.updatedBy = req.user._id;

      if (note && note.trim()) {
        complaintDoc.resolutionNote = note.trim();
      }

      await complaintDoc.save();
      await complaintDoc.populate("assignedToUserId", "name phone");

      return res.status(200).json({
        success: true,
        message: "Complaint rejected by MC COO",
        requestedBy: {
          userId: req.user._id,
          role: "MC_COO",
        },
        complaint: complaintDoc,
      });
    });
  } catch (error) {
    console.error("Error in rejectComplaintByMcCoo:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  getComplaintsForMcCoo,
  getMcEmployees,
  assignTaskToMcEmployee,
  approveComplaintByMcCoo,
  rejectComplaintByMcCoo,
  checkIsMcCoo,
};
