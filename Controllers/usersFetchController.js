const User = require("../models/usersModel");
const Role = require("../models/roleModels");
const { paginate } = require("../utils/pagination");
const mongoose = require('mongoose')

/**
 * Helper: Get roleId by role name
 */
/**
 * Fetch users by role name
 * Query params: roleName (required), page, limit, search, isActive, zilaId, tehsilId, mcId
 */


/**
 * Fetch users by role name
 * Query params: roleName (required), page, limit, search, isActive, zilaId, tehsilId, mcId
 */
const getRoleIdByName = async (roleName) => {
  // Find the single Role document
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role config not found");
  
  // Find the specific role object in the roles array by name
  const role = roleConfig.roles.find(
    r => r.name.toLowerCase() === roleName.toLowerCase() 
  );
  
  if (!role) throw new Error(`Role "${roleName}" not found or inactive`);
  
  // Return the _id of the role object from the array
  return role._id;
};

/**
 * Fetch users by role name
 * Query params: roleName (required), page, limit, search, isActive, zilaId, tehsilId, mcId
 */
const getUsersByRole = async (req, res) => {
  try {
    const { roleName } = req.query;

    // Validate roleName
    if (!roleName || roleName.trim() === "") {
      return res.status(400).json({ 
        message: "Role name is required as a query parameter" 
      });
    }

    // Get roleId from role name
    let roleId;
    try {
      roleId = await getRoleIdByName(roleName.trim());
    } catch (error) {
      return res.status(404).json({ 
        message: error.message 
      });
    }

    // Query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, isActive, zilaId, tehsilId, mcId } = req.query;

    // Build dynamic query - roleId should match the _id from roles array
    let query = { roleId: roleId };

    // Search by name or username
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    // Filter by location IDs
    if (zilaId && zilaId !== "") query.zilaId = zilaId;
    if (tehsilId && tehsilId !== "") query.tehsilId = tehsilId;
    if (mcId && mcId !== "") query.mcId = mcId;

    // Fetch paginated results
    const result = await paginate({
      query,
      model: User,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
        { path: "mcId", select: "name" },
      ],
      select: "-password", // Exclude password from results
    });

    res.status(200).json({
      message: `Users with role "${roleName}" fetched successfully`,
      roleName,
      roleId: roleId.toString(), // Convert to string for response
      filtersApplied: {
        search: search || null,
        isActive: isActive || null,
        zilaId: zilaId || null,
        tehsilId: tehsilId || null,
        mcId: mcId || null,
      },
      ...result,
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

module.exports = {
  getUsersByRole,
};