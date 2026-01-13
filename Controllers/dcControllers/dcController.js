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
    const { name, username, password, phone, roleId, zilaId, tehsilId, mcId } =
      req.body;

    // 1️⃣ Required fields
    if (!name || !username || !password || !phone || !roleId || !zilaId) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 2️⃣ Check username uniqueness
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // 3️⃣ Validate Zila exists (no ObjectId check)
    const zila = await Zila.findOne({ _id: zilaId });
    if (!zila) {
      return res.status(400).json({
        message: "Invalid Zila",
      });
    }

    // 4️⃣ Optional relations validation
    if (tehsilId) {
      const tehsil = await Tehsil.findOne({ _id: tehsilId });
      if (!tehsil) {
        return res.status(400).json({
          message: "Invalid Tehsil",
        });
      }
    }

    if (mcId) {
      const mc = await MC.findOne({ _id: mcId });
      if (!mc) {
        return res.status(400).json({
          message: "Invalid MC",
        });
      }
    }

    // 5️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ Create user
    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      phone,
      roleId,
      zilaId,
      tehsilId: tehsilId || undefined,
      mcId: mcId || undefined,
    });

    // 7️⃣ Populate relations
    const populatedUser = await User.findById(user._id)
      .populate("zilaId", "name")
      .populate("tehsilId", "name")
      .populate("mcId", "name");

    // 8️⃣ Response
    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        username: populatedUser.username,
        phone: populatedUser.phone,
        roleId: populatedUser.roleId,
        zila: populatedUser.zilaId,
        tehsil: populatedUser.tehsilId,
        mc: populatedUser.mcId,
        isActive: populatedUser.isActive,
        createdAt: populatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
/**
 * Get complaints for DC
 */
// const getComplaintsForDC = async (req, res) => {
//   try {
//     const dcUser = req.user;
//     if (!(await checkIsDC(dcUser))) {
//       return res.status(403).json({ message: "Access denied. DC only." });
//     }

//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const { search, status, categoryId, startDate, endDate } = req.query;

//     let query = { zilaId: dcUser.zilaId };

//     if (search && search.trim() !== "") {
//       const searchRegex = new RegExp(search.trim(), "i");
//       query.$or = [{ title: searchRegex }, { description: searchRegex }];
//     }

//     if (status && status !== "ALL") query.status = status;
//     if (categoryId && categoryId !== "") query.categoryId = categoryId;

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) {
//         const end = new Date(endDate);
//         end.setHours(23, 59, 59, 999);
//         query.createdAt.$lte = end;
//       }
//     }

//     // Mark unseen complaints as seen
//     await Complaint.updateMany(
//       { ...query, seen: false },
//       { $set: { seen: true, updatedAt: new Date() } }
//     );

//     const result = await paginate({
//       query,
//       model: Complaint,
//       page,
//       limit,
//       sort: { createdAt: -1 },
//       populate: [
//         { path: "createdByVolunteerId", select: "name username" },
//         { path: "categoryId", select: "name" },
//       ],
//     });

//     res.status(200).json({
//       message: "Complaints fetched successfully",
//       filtersApplied: {
//         search: search || null,
//         status: status || null,
//         categoryId: categoryId || null,
//         dateRange: startDate || endDate ? { startDate, endDate } : null,
//       },
//       ...result,
//     });
//   } catch (error) {
//     console.error("Error fetching complaints for DC:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

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
 * Get single complaint by ID for DC
 */
const getComplaintByIdForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    if (!(await checkIsDC(dcUser))) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({
      _id: complaintId,
    });
    
    if (!complaint) {
      return res
        .status(404)
        .json({ message: "Complaint not found or access denied." });
    }

    res.status(200).json({
      message: "Complaint retrieved successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        title: complaint.title,
      },
    });
  } catch (error) {
    console.error("Error retrieving complaint:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approveResolutionForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    const dcRoleId = await getRoleId("DC");
    const { complaintId } = req.params;

    if (dcUser.roleId.toString() !== dcRoleId) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.zilaId.toString() !== dcUser.zilaId.toString()) {
      return res.status(403).json({ 
        message: "Cannot approve complaint from different Zila" 
      });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({ 
        message: "Only RESOLVED complaints can be approved" 
      });
    }

    complaint.status = "closed";
    complaint.updatedAt = new Date();
    await complaint.save();

    res
      .status(200)
      .json({ message: "Complaint status updated successfully", complaint });
    res.status(200).json({
      message: "Complaint resolution approved successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        title: complaint.title,
      },
    });
  } catch (error) {
    console.error("Error updating complaint status:", error);
    console.error("Error approving resolution:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Reject complaint resolution (DC)
 */
const rejectResolutionForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    const dcRoleId = await getRoleId("DC");
    const { complaintId } = req.params;
    const { remark } = req.body;

    if (dcUser.roleId.toString() !== dcRoleId) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    if (!remark) {
      return res.status(400).json({ 
        message: "Remark is required for rejection" 
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.zilaId.toString() !== dcUser.zilaId.toString()) {
      return res.status(403).json({ 
        message: "Cannot reject complaint from different Zila" 
      });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({ 
        message: "Only RESOLVED complaints can be rejected" 
      });
    }

    // Update status to rejected and add DC's remark
    complaint.status = "rejected";
    complaint.remarkByDc = remark
    complaint.rejectedBy = dcUser._id;
    complaint.rejectedAt = new Date();
    complaint.updatedAt = new Date();
    await complaint.save();

    res.status(200).json({
      message: "Complaint resolution rejected successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        title: complaint.title,
        rejectionRemark: remark,
      },
    });
  } catch (error) {
    console.error("Error rejecting resolution:", error);
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
    if (!(await checkIsDC(dcUser))) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, roleId, isActive } = req.query;

    let query = { _id: { $ne: dcUser._id } };

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { username: regex }];
    }

    if (roleId && roleId !== "ALL") query.roleId = roleId;
    if (isActive !== undefined && isActive !== "")
      query.isActive = isActive === "true";

    // 1️⃣ Fetch all roles once
    const roleDoc = await Role.findOne();
    let roleMap = new Map();
    if (roleDoc) {
      roleDoc.roles.forEach((r) => roleMap.set(r._id.toString(), r.name));
    }

    // 2️⃣ Fetch users with pagination
    const result = await paginate({
      model: User,
      query,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "tehsilId", select: "_id name" },
        { path: "zilaId", select: "_id name" },
        { path: "mcId", select: "_id name" },
      ],
    });

    // 3️⃣ Inject role names using Map (O(1) lookup)
    result.data = result.data.map((u) => {
      const userObj = u.toObject();
      userObj.role = {
        id: userObj.roleId,
        name: roleMap.get(userObj.roleId?.toString()) || null,
      };
      return userObj;
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
 * Delete user (DC only)
 */
const deleteUserForDC = async (req, res) => {
  try {
    const dcUser = req.user;

    // 🔐 Only DC allowed
    if (!(await checkIsDC(dcUser))) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // 🔍 Find user in same district
    const user = await User.findOne({
      _id: userId,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found or does not belong to your district.",
      });
    }

    // ❌ DC cannot delete himself
    if (user._id.toString() === dcUser._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own account.",
      });
    }

    // 🗑️ Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "User deleted successfully",
      deletedUser: {
        _id: user._id,
        name: user.name,
        username: user.username,
        roleId: user.roleId,
      },
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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
  deleteComplaintForDC,
  approveResolutionForDC,
  rejectResolutionForDC,
  updateUserStatusForDC,
  getAllUsersForDC,
  updateUserDetails,
  createMC,
  getComplaintByIdForDC,
  createUser,
  deleteUserForDC,
  getComplaintByIdForDC
};
