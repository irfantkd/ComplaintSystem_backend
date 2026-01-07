const Complaint = require("../../models/complaintModel");
const { paginate } = require("../../utils/pagination");
const bcrypt = require("bcryptjs");
const User = require("../../models/usersModel");
const Zila = require("../../models/zilaModel");
const Tehsil = require("../../models/tehsilModel");
const MC = require("../../models/MCModel");
const Role = require("../../models/roleModels");

/**
 * Helper: get roleId by role name
 */
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("RoleConfig not found");
  const role = roleConfig.roles.find((r) => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

/**
 * Middleware check for DC
 */
const checkIsDC = async (user) => {
  const dcRoleId = await getRoleId("DC");
  return user.roleId.toString() === dcRoleId;
};

const createUser = async (req, res) => {
  try {
    const { name, username, password, roleId, districtId, tehsilId, mcId } =
      req.body;

    // 1️⃣ Basic validation
    if (!name || !username || !password || !roleId) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      username,
      password: hashedPassword,
      roleId,
      districtId: districtId || undefined,
      tehsilId: tehsilId || undefined,
      mcId: mcId || undefined,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        hashedPassword,
        role: newUser.roleId,
        districtId: newUser.districtId,
        tehsilId: newUser.tehsilId,
        mcId: newUser.mcId,
      },
    });
  } catch (error) {
    console.error("Create User Error:", error.message);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

/**
 * Get complaints for DC
 */
const getComplaintsForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser))) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, status, categoryId, startDate, endDate } = req.query;

    let query = { zilaId: dcUser.zilaId };

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    if (status && status !== "ALL") query.status = status;
    if (categoryId && categoryId !== "") query.categoryId = categoryId;

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
    await Complaint.updateMany(
      { ...query, seen: false },
      { $set: { seen: true, updatedAt: new Date() } }
    );

    const result = await paginate({
      query,
      model: Complaint,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "createdByVolunteerId", select: "name username" },
        { path: "categoryId", select: "name" },
      ],
    });

    res.status(200).json({
      message: "Complaints fetched successfully",
      filtersApplied: {
        search: search || null,
        status: status || null,
        categoryId: categoryId || null,
        dateRange: startDate || endDate ? { startDate, endDate } : null,
      },
      ...result,
    });
  } catch (error) {
    console.error("Error fetching complaints for DC:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete complaint for DC
 */
const deleteComplaintForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const { complaintId } = req.params;
    if (!complaintId)
      return res.status(400).json({ message: "Complaint ID is required." });

    const complaint = await Complaint.findById(complaintId);
    if (!complaint)
      return res.status(404).json({ message: "Complaint not found." });
    if (complaint.zilaId.toString() !== dcUser.zilaId.toString())
      return res.status(403).json({ message: "Access denied. DC only." });

    await Complaint.findByIdAndDelete(complaintId);

    res
      .status(200)
      .json({ message: "Complaint deleted successfully", complaint });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update complaint status for DC
 */
const updateStatusForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const { complaintId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "progress",
      "resolved",
      "completed",
      "closed",
      "delayed",
      "rejected",
      "resolveByEmployee",
    ];

    if (!status || !allowedStatuses.includes(status))
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(
          ", "
        )}`,
      });

    const complaint = await Complaint.findOne({
      _id: complaintId,
      zilaId: dcUser.zilaId,
    });
    if (!complaint)
      return res
        .status(404)
        .json({ message: "Complaint not found or access denied." });

    complaint.status = status;
    await complaint.save();

    res
      .status(200)
      .json({ message: "Complaint status updated successfully", complaint });
  } catch (error) {
    console.error("Error updating complaint status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update user active status for DC
 */
const updateUserStatusForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean")
      return res
        .status(400)
        .json({ message: "'isActive' must be true or false." });

    const user = await User.findOne({ _id: userId, zilaId: dcUser.zilaId });
    if (!user)
      return res.status(404).json({
        message: "User not found or does not belong to your district.",
      });

    if (user._id.toString() === dcUser._id.toString())
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account." });

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        roleId: user.roleId,
        isActive: user.isActive,
        zilaId: user.zilaId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get all users in DC's zila
 */
const getAllUsersForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, roleId, isActive } = req.query;

    let query = { zilaId: dcUser.zilaId, _id: { $ne: dcUser._id } };

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { username: regex }];
    }

    if (roleId && roleId !== "ALL") query.roleId = roleId;
    if (isActive !== undefined && isActive !== "")
      query.isActive = isActive === "true" || isActive === true;

    const result = await paginate({
      query,
      model: User,
      page,
      limit,
      sort: { createdAt: -1 },
    });

    res.status(200).json({
      message: "Users fetched successfully",
      filtersApplied: {
        search: search || null,
        roleId: roleId || null,
        isActive: isActive !== undefined ? isActive : null,
      },
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update user details (roleId based)
 */
const updateUserDetails = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const { userId } = req.params;
    const { name, username, password, roleId, zilaId, tehsilId, mcId } =
      req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.username = username || user.username;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    user.roleId = roleId || user.roleId;
    user.zilaId = zilaId || user.zilaId;
    user.tehsilId = tehsilId || user.tehsilId;
    user.mcId = mcId || user.mcId;

    await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create MC (DC only)
 */
const createMC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser)))
      return res.status(403).json({ message: "Access denied. DC only." });

    const { name, tehsilId, zilaId } = req.body;
    const tehsil = await Tehsil.findById(tehsilId);
    if (!tehsil) return res.status(404).json({ message: "Tehsil not found" });
    const zila = await Zila.findById(zilaId);
    if (!zila) return res.status(404).json({ message: "Zila not found" });

    const mc = await MC.create({ name, tehsilId, zilaId });
    res.status(201).json({ message: "MC created successfully", mc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getComplaintsForDC,
  deleteComplaintForDC,
  updateStatusForDC,
  updateUserStatusForDC,
  getAllUsersForDC,
  updateUserDetails,
  createMC,
  createUser,
};
