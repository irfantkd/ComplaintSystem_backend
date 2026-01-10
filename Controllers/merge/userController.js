// controllers/userController.js
// (or wherever you keep user-related endpoints)

const User = require("../../models/usersModel");
const Role = require("../../models/roleModels");
const { paginate } = require("../../utils/pagination");
const mongoose = require("mongoose");

/**
 * Helper function inside the file - get role ID by name
 */
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role configuration not found");

  const role = roleConfig.roles.find((r) => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

/**
 * Helper function inside the file - get role name by ID (with simple cache)
 */
let roleNameCache = null;

const getRoleNameById = async (roleId) => {
  if (!roleNameCache) {
    const config = await Role.findOne().lean();
    if (!config) throw new Error("Role configuration not found");

    roleNameCache = {};
    config.roles.forEach((r) => {
      roleNameCache[r._id.toString()] = r.name;
    });
  }
  return roleNameCache[roleId.toString()] || null;
};

/**
 * Unified endpoint: Get managed/visible users based on caller's role
 * GET /api/users/managed
 */
const getManagedUsers = async (req, res) => {
  try {
    const caller = req.user;

    if (!caller?.roleId) {
      return res.status(403).json({ message: "Role not assigned" });
    }

    const callerRoleName = await getRoleNameById(caller.roleId);

    let baseQuery = {};
    let allowedFilters = {};
    let responseExtra = {};
    let selectFields = "name username phone zilaId tehsilId mcId isActive";
    let populateFields = [
      { path: "zilaId", select: "name" },
      { path: "tehsilId", select: "name" },
      { path: "mcId", select: "name" },
    ];

    switch (callerRoleName) {
      // ─────────────── MC Chief Officer ───────────────
      case "MC_CO":
      case "MUNICIPAL_COMMITTEE_CO":
        if (!caller.tehsilId) {
          return res
            .status(400)
            .json({ message: "Tehsil not assigned to MC_CO" });
        }

        const mcEmployeeRoleId = await getRoleId("MC_EMPLOYEE");

        baseQuery = {
          roleId: new mongoose.Types.ObjectId(mcEmployeeRoleId),
          tehsilId: caller.tehsilId,
          isActive: true,
        };

        responseExtra = {
          requestedBy: {
            userId: caller._id,
            role: "MC_CO",
            tehsilId: caller.tehsilId,
          },
        };
        break;

      // ─────────────── District Council Officer ───────────────
      case "DISTRICT_COUNCIL_OFFICER":
      case "DCO":
        const dcoRoleId = await getRoleId("DISTRICT_COUNCIL_OFFICER");

        baseQuery = {
          roleId: new mongoose.Types.ObjectId(dcoRoleId),
          isActive: true,
        };

        responseExtra = {
          requestedBy: {
            userId: caller._id,
            role: "DISTRICT_COUNCIL_OFFICER",
          },
        };
        break;

      // ─────────────── Deputy Commissioner ───────────────
      case "DC":
      case "DEPUTY_COMMISSIONER":
        if (!caller.zilaId) {
          return res
            .status(400)
            .json({ message: "District not assigned to DC" });
        }

        baseQuery = {
          zilaId: caller.zilaId,
          _id: { $ne: caller._id }, // exclude self
        };

        allowedFilters = {
          search: true,
          roleId: true,
          isActive: true,
        };

        responseExtra = {
          filtersApplied: {},
        };

        // Include roleId for name mapping
        selectFields += " roleId";
        break;

      default:
        return res.status(403).json({
          message: "Your role is not authorized to view managed users",
        });
    }

    // ───────────────────── Apply common filters (if allowed) ─────────────────────
    let finalQuery = { ...baseQuery };

    const { search, roleId, isActive } = req.query;

    if (allowedFilters.search && search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      finalQuery.$or = [{ name: regex }, { username: regex }];
    }

    if (allowedFilters.roleId && roleId && roleId !== "ALL") {
      finalQuery.roleId = new mongoose.Types.ObjectId(roleId);
    }

    if (allowedFilters.isActive && isActive !== undefined && isActive !== "") {
      finalQuery.isActive = isActive === "true";
    }

    // ───────────────────── Pagination & Fetch ─────────────────────
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let result = await paginate({
      query: finalQuery,
      model: User,
      page,
      limit,
      sort: { createdAt: -1 },
      select: selectFields,
      populate: populateFields,
    });

    // ───────────────────── Add role name (mainly for DC) ─────────────────────
    if (callerRoleName === "DC" || callerRoleName === "DEPUTY_COMMISSIONER") {
      const roleDoc = await Role.findOne().lean();
      const roleMap = new Map();
      roleDoc?.roles?.forEach((r) => roleMap.set(r._id.toString(), r.name));

      result.data = result.data.map((user) => {
        const u = user.toObject();
        u.role = {
          id: u.roleId?.toString(),
          name: roleMap.get(u.roleId?.toString()) || "Unknown",
        };
        // Optional: remove raw roleId from response
        // delete u.roleId;
        return u;
      });
    }

    // Fill filtersApplied for DC style response
    if (responseExtra.filtersApplied) {
      responseExtra.filtersApplied = {
        search: search || null,
        roleId: roleId || null,
        isActive: isActive !== undefined ? isActive : null,
      };
    }

    return res.json({
      success: true,
      message: "Managed users fetched successfully",
      ...responseExtra,
      ...result,
    });
  } catch (error) {
    console.error("getManagedUsers error:", error);
    const status = error.message.includes("assigned") ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: "Error fetching managed users",
      error: error.message,
    });
  }
};

module.exports = { getManagedUsers };
