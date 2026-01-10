const user = require("../../models/usersModel");
const Role = require("../../models/roleModels");
const { paginate } = require("../../utils/pagination");
const Complaint = require("../../models/complaintModel");

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

/**
 * View all complaints assigned to the logged-in employee
 * Allowed only for MC_EMPLOYEE and DISTRICT_COUNCIL_EMPLOYEE
 */
const getComplaintsForEmployee = async (req, res) => {
  try {
    const employeeUser = req.user;

    // Define allowed role names
    const allowedRoleNames = ["MC_EMPLOYEE", "DISTRICT_COUNCIL_EMPLOYEE"];

    // Fetch the actual _id for each allowed role
    const allowedRoleIds = await Promise.all(
      allowedRoleNames.map((name) => getRoleId(name))
    );

    // Check if user's role is one of the allowed roles
    if (!allowedRoleIds.includes(employeeUser.roleId.toString())) {
      return res.status(403).json({
        message:
          "Access denied. Only MC Employee or District Council Employee allowed.",
      });
    }

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, status, categoryId, startDate, endDate, areaType } =
      req.query;

    // Build base query: complaints assigned to this employee
    let query = { assignedToUserId: employeeUser._id };

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

    // Mark unseen complaints (assigned to this employee) as seen
    await Complaint.updateMany(
      { ...query, seen: false },
      { $set: { seen: true, updatedAt: new Date() } }
    );

    // Fetch paginated results with population (consistent with AC endpoint)
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
    console.error("Error fetching complaints for employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getComplaintsForEmployee,
};
