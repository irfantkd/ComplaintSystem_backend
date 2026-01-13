const mongoose = require('mongoose');
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

// Middleware: Only MC_CO can access these routes
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
    req.user.roleName = "MC_CO";
    next();
  } catch (error) {
    console.error("Role check error (MC_CO):", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying role",
      error: error.message,
    });
  }
};

// 1. Get Complaints for MC COO (City + same tehsil)
const getComplaintsForMcCoo = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const baseQuery = {
        areaType: "City",
        tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
      };

      const filterQuery = { ...baseQuery };

      if (req.query.status && req.query.status !== "ALL") {
        filterQuery.status = req.query.status;
      }
      
      if (req.query.categoryId) {
        filterQuery.categoryId = new mongoose.Types.ObjectId(req.query.categoryId);
      }
      
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.trim(), "i");
        filterQuery.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { locationName: searchRegex },
        ];
      }

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        filterQuery.createdAt = {};
        if (req.query.startDate) {
          filterQuery.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          end.setHours(23, 59, 59, 999);
          filterQuery.createdAt.$lte = end;
        }
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const populateOptions = [
        { path: "createdByVolunteerId", select: "name phone email" },
        { path: "categoryId", select: "name" },
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
        { path: "assignedToUserId", select: "name phone email" },
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
        complaints: result.data || result.docs || result.complaints || [],
        pagination: {
          page: result.page || page,
          limit: result.limit || limit,
          totalPages: result.totalPages || 0,
          totalDocs: result.totalDocs || 0,
          hasNextPage: result.hasNextPage || false,
          hasPrevPage: result.hasPrevPage || false,
        },
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
          tehsilId: req.mcCooTehsilId,
        },
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

// 2. Get Complaint by ID for MC COO
const getComplaintByIdForMcCoo = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const { complaintId } = req.params;

      if (!complaintId) {
        return res.status(400).json({
          success: false,
          message: "complaintId is required",
        });
      }

     

      const complaintDoc = await complaint.findById(complaintId).populate("tehsilId","zilaId")

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found or not under this MC jurisdiction",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Complaint fetched successfully",
        complaint: complaintDoc,
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
          tehsilId: req.mcCooTehsilId,
        },
      });
    });
  } catch (error) {
    console.error("Error in getComplaintByIdForMcCoo:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 3. Get MC Employees
const getMcEmployees = async (req, res) => {
  try {
    await checkIsMcCoo(req, res, async () => {
      const employeeRoleId = await getRoleId("MC_EMPLOYEE");

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await paginate({
        query: {
          roleId: employeeRoleId,
          tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
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
        employees: result.data || result.docs || result.employees || [],
        pagination: {
          page: result.page || page,
          limit: result.limit || limit,
          totalPages: result.totalPages || 0,
          totalDocs: result.totalDocs || 0,
          hasNextPage: result.hasNextPage || false,
          hasPrevPage: result.hasPrevPage || false,
        },
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
        },
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

// 4. Assign Task to MC Employee
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
        tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found or not under this MC jurisdiction",
        });
      }

      // ✅ CHECK: If complaint is already assigned
      if (complaintDoc.assignedToUserId) {
        return res.status(400).json({
          success: false,
          message: "This complaint is already assigned to an employee",
          assignedTo: complaintDoc.assignedToUserId,
        });
      }

      const employeeRoleId = await getRoleId("MC_EMPLOYEE");
      const employee = await User.findOne({
        _id: employeeUserId,
        roleId: employeeRoleId,
        tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
        isActive: true,
      });

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive MC Employee",
        });
      }

      complaintDoc.assignedToUserId = employeeUserId;
      complaintDoc.assignedToRole = "MC_EMPLOYEE";
      complaintDoc.status = "progress";

      await complaintDoc.save();
      await complaintDoc.populate("assignedToUserId", "name phone email username");

      return res.status(200).json({
        success: true,
        message: "Task assigned successfully to MC employee",
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
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



// 5. Approve Complaint by MC COO
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
        tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
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

      if (note && note.trim()) {
        complaintDoc.remarkByDc = note.trim();
      }

      await complaintDoc.save();
      await complaintDoc.populate([
        { path: "assignedToUserId", select: "name phone email" },
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "categoryId", select: "name" },
        {path:"zilaId",select:"name"}

      ]);

      return res.status(200).json({
        success: true,
        message: "Complaint approved and marked as resolved",
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
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

// 6. Reject Complaint by MC COO
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
        tehsilId: new mongoose.Types.ObjectId(req.mcCooTehsilId),
        status: "resolveByEmployee",
      });

      if (!complaintDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Complaint not found, not under this MC, or not eligible for rejection",
        });
      }

      complaintDoc.status = "rejected";

      if (note && note.trim()) {
        complaintDoc.remarkByDc = note.trim();
      }

      await complaintDoc.save();
      await complaintDoc.populate([
        { path: "assignedToUserId", select: "name phone email" },
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "categoryId", select: "name" },
      ]);

      return res.status(200).json({
        success: true,
        message: "Complaint rejected by MC COO",
        requestedBy: {
          userId: req.user._id,
          role: "MC_CO",
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
  getComplaintByIdForMcCoo,
  getMcEmployees,
  assignTaskToMcEmployee,
  approveComplaintByMcCoo,
  rejectComplaintByMcCoo,
  checkIsMcCoo,
};