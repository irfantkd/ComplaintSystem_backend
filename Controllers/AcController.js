const Complaint = require("../models/complaintModel");
const User = require("../models/usersModel");
const { paginate } = require("../utils/pagination");
const Role = require("../models/roleModels");

/**
 * Helper: Get roleId by role name
 */
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role config not found");
  const role = roleConfig.roles.find(r => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

/**
 * View all complaints for AC's Tehsil
 */
const getComplaintsForAC = async (req, res) => {
  try {
    const acUser = req.user;
    const acRoleId = await getRoleId("AC");

    if (acUser.roleId.toString() !== acRoleId) {
      return res.status(403).json({ message: "Access denied. AC only." });
    }

    if (!acUser.tehsilId) {
      return res.status(400).json({ message: "AC must be assigned to a Tehsil" });
    }

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, status, categoryId, startDate, endDate, areaType } = req.query;

    // Build dynamic query
    let query = { tehsilId: acUser.tehsilId };

    // Text Search
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Filter by status
    if (status && status !== "ALL") query.status = status;

    // Filter by category
    if (categoryId && categoryId !== "") query.categoryId = categoryId;

    // Filter by area type
    if (areaType && areaType !== "ALL") query.areaType = areaType;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Mark unseen complaints as seen
    await Complaint.updateMany({ ...query, seen: false }, { $set: { seen: true, updatedAt: new Date() } });

    // Fetch paginated results
    const result = await paginate({
      query,
      model: Complaint,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "createdByVolunteerId", select: "name username" },
        { path: "categoryId", select: "name" },
        { path: "assignedToUserId", select: "name username roleId" },
      ],
    });

    res.status(200).json({
      message: "Complaints fetched successfully",
      filtersApplied: {
        search: search || null,
        status: status || null,
        categoryId: categoryId || null,
        areaType: areaType || null,
        dateRange: startDate || endDate ? { startDate, endDate } : null,
      },
      ...result,
    });
  } catch (error) {
    console.error("Error fetching complaints for AC:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Approve complaint resolution
 */
const approveResolution = async (req, res) => {
  try {
    const acUser = req.user;
    const acRoleId = await getRoleId("AC");
    const { complaintId } = req.params;
    const { remark } = req.body;

    if (acUser.roleId.toString() !== acRoleId) {
      return res.status(403).json({ message: "Access denied. AC only." });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (complaint.tehsilId.toString() !== acUser.tehsilId.toString()) {
      return res.status(403).json({ message: "Cannot approve complaint from different Tehsil" });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({ message: "Only RESOLVED complaints can be approved" });
    }

    complaint.status = "completed";
    complaint.updatedAt = new Date();
    await complaint.save();

    res.status(200).json({
      message: "Complaint resolution approved successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        title: complaint.title,
      },
      remark,
    });
  } catch (error) {
    console.error("Error approving resolution:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Reject complaint resolution
 */
const rejectResolution = async (req, res) => {
  try {
    const acUser = req.user;
    const acRoleId = await getRoleId("AC");
    const { complaintId } = req.params;
    const { remark, reassignToMC } = req.body;

    if (acUser.roleId.toString() !== acRoleId) {
      return res.status(403).json({ message: "Access denied. AC only." });
    }

    if (!remark) return res.status(400).json({ message: "Remark is required for rejection" });

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (complaint.tehsilId.toString() !== acUser.tehsilId.toString()) {
      return res.status(403).json({ message: "Cannot reject complaint from different Tehsil" });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({ message: "Only RESOLVED complaints can be rejected" });
    }

    complaint.status = reassignToMC ? "ASSIGNED_TO_EMPLOYEE" : "REJECTED";
    complaint.updatedAt = new Date();
    await complaint.save();

    res.status(200).json({
      message: "Complaint resolution rejected",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        title: complaint.title,
      },
      remark,
    });
  } catch (error) {
    console.error("Error rejecting resolution:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get statistics for AC dashboard
 */
const getACDashboardStats = async (req, res) => {
  try {
    const acUser = req.user;
    const acRoleId = await getRoleId("AC");

    if (acUser.roleId.toString() !== acRoleId) {
      return res.status(403).json({ message: "Access denied. AC only." });
    }

    if (!acUser.tehsilId) return res.status(400).json({ message: "AC must be assigned to a Tehsil" });

    const baseQuery = { tehsilId: acUser.tehsilId };

    const totalComplaints = await Complaint.countDocuments(baseQuery);
    const submittedComplaints = await Complaint.countDocuments({ ...baseQuery, status: "SUBMITTED" });
    const assignedComplaints = await Complaint.countDocuments({ ...baseQuery, status: { $in: ["ASSIGNED", "FORWARDED_TO_MC", "ASSIGNED_TO_EMPLOYEE"] } });
    const inProgressComplaints = await Complaint.countDocuments({ ...baseQuery, status: "IN_PROGRESS" });
    const resolvedComplaints = await Complaint.countDocuments({ ...baseQuery, status: "RESOLVED" });
    const completedComplaints = await Complaint.countDocuments({ ...baseQuery, status: "COMPLETED" });
    const delayedComplaints = await Complaint.countDocuments({ ...baseQuery, status: "DELAYED" });
    const rejectedComplaints = await Complaint.countDocuments({ ...baseQuery, status: "REJECTED" });

    const unseenCount = await Complaint.countDocuments({ ...baseQuery, seen: false });

    res.status(200).json({
      message: "Dashboard statistics fetched successfully",
      stats: {
        total: totalComplaints,
        submitted: submittedComplaints,
        assigned: assignedComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        completed: completedComplaints,
        delayed: delayedComplaints,
        rejected: rejectedComplaints,
        unseen: unseenCount,
      },
    });
  } catch (error) {
    console.error("Error fetching AC dashboard stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getComplaintsForAC,
  approveResolution,
  rejectResolution,
  getACDashboardStats,
};
