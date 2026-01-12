// const User = require("../../models/usersModel");
// const Role = require("../../models/roleModels");
// const { paginate } = require("../../utils/pagination");
// const mongoose = require("mongoose");

// const getRoleId = async (roleName) => {
//   const roleConfig = await Role.findOne();
//   if (!roleConfig) throw new Error("Role configuration not found");

//   const role = roleConfig.roles.find((r) => r.name === roleName);
//   if (!role) throw new Error(`Role "${roleName}" not found`);
//   return role._id.toString();
// };

// /**
//  * Helper function inside the file - get role name by ID (with simple cache)
//  */
// let roleNameCache = null;

// const getRoleNameById = async (roleId) => {
//   if (!roleNameCache) {
//     const config = await Role.findOne().lean();
//     if (!config) throw new Error("Role configuration not found");

//     roleNameCache = {};
//     config.roles.forEach((r) => {
//       roleNameCache[r._id.toString()] = r.name;
//     });
//   }
//   return roleNameCache[roleId.toString()] || null;
// };

// /**
//  * Unified endpoint: Get managed/visible users based on caller's role
//  */
// const getManagedUsers = async (req, res) => {
//   try {
//     const caller = req.user;

//     if (!caller?.roleId) {
//       return res.status(403).json({ message: "Role not assigned" });
//     }

//     const callerRoleName = await getRoleNameById(caller.roleId);

//     let baseQuery = {};
//     let allowedFilters = {};
//     let responseExtra = {};
//     let selectFields = "name username phone zilaId tehsilId mcId isActive";
//     let populateFields = [
//       { path: "zilaId", select: "name" },
//       { path: "tehsilId", select: "name" },
//       { path: "mcId", select: "name" },
//     ];

//     switch (callerRoleName) {
//       // ─── DC ───────────────────────────────────────────────────────
//       case "DC":
//       case "DEPUTY_COMMISSIONER": {
//         if (!caller.zilaId) {
//           return res
//             .status(400)
//             .json({ message: "District not assigned to DC" });
//         }

//         const excludeRoleIds = await Promise.all([
//           getRoleId("USER"),
//           getRoleId("DC"),
//         ]);

//         baseQuery = {
//           zilaId: caller.zilaId,
//           roleId: { $nin: excludeRoleIds },
//           _id: { $ne: caller._id },
//           isActive: true,
//         };

//         selectFields += " roleId";
//         allowedFilters = {
//           search: true,
//           roleId: true,
//           isActive: true,
//         };
//         break;
//       }

//       // ─── AC ───────────────────────────────────────────────────────
//       case "AC":
//       case "ASSISTANT_COMMISIONER": {
//         if (!caller.tehsilId) {
//           return res.status(400).json({ message: "Tehsil not assigned to AC" });
//         }

//         const subordinateRoleIds = await Promise.all([
//           getRoleId("MC_CO"),
//           getRoleId("MC_EMPLOYEE"),
//         ]);
//         const excludeRoleIds = await Promise.all([
//           getRoleId("USER"),
//           getRoleId("DC"),
//         ]);

//         baseQuery = {
//           tehsilId: caller.tehsilId,
//           roleId: { $nin: excludeRoleIds },
//           roleId: { $in: subordinateRoleIds },
//           isActive: true,
//         };

//         allowedFilters = {
//           search: true,
//           isActive: true,
//         };
//         break;
//       }

//       // ─── MC_CO ────────────────────────────────────────────────────
//       case "MC_CO":
//       case "MUNICIPAL_COMMITTEE_CO": {
//         if (!caller.tehsilId) {
//           return res.status(400).json({
//             message: "Tehsil id required for MC_CO",
//           });
//         }
//         const excludeRoleIds = await Promise.all([
//           getRoleId("USER"),
//           getRoleId("DC"), // ← uncomment if you want to exclude other DCs
//           getRoleId("AC"), // ← uncomment if you want to exclude other ACs
//         ]);

//         baseQuery = {
//           tehsilId: caller.tehsilId,
//           roleId: { $nin: excludeRoleIds },
//           mcId: caller.mcId, // ← critical filter!
//           roleId: await getRoleId("MC_EMPLOYEE"),
//           isActive: true,
//         };

//         allowedFilters = {
//           search: true,
//           isActive: true,
//         };
//         break;
//       }

//       // ─── DISTRICT_COUNCIL_OFFICER ─────────────────────────────────
//       case "DISTRICT_COUNCIL_OFFICER":
//       case "DCO": {
//         const employeeRoleId = await getRoleId("DISTRICT_COUNCIL_EMPLOYEE");
//         const excludeRoleIds = await Promise.all([
//           getRoleId("USER"),
//           getRoleId("DC"),
//           getRoleId("AC"),
//           getRoleId("MC_CO"),
//         ]);

//         baseQuery = {
//           roleId: { $nin: excludeRoleIds },
//           roleId: employeeRoleId,
//           isActive: true,
//           zilaId: caller.zilaId, // ← add this if DCO should only see his district
//         };

//         allowedFilters = {
//           search: true,
//           isActive: true,
//         };
//         break;
//       }

//       default:
//         return res.status(403).json({
//           message: "Your role is not authorized to view managed users",
//         });
//     }

//     // ───────────────────── Apply common filters (if allowed) ─────────────────────
//     let finalQuery = { ...baseQuery };

//     const { search, roleId, isActive } = req.query;

//     if (allowedFilters.search && search?.trim()) {
//       const regex = new RegExp(search.trim(), "i");
//       finalQuery.$or = [{ name: regex }, { username: regex }];
//     }

//     if (allowedFilters.roleId && roleId && roleId !== "ALL") {
//       finalQuery.roleId = new mongoose.Types.ObjectId(roleId);
//     }

//     if (allowedFilters.isActive && isActive !== undefined && isActive !== "") {
//       finalQuery.isActive = isActive === "true";
//     }

//     // ───────────────────── Pagination & Fetch ─────────────────────
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     let result = await paginate({
//       query: finalQuery,
//       model: User,
//       page,
//       limit,
//       sort: { createdAt: -1 },
//       select: selectFields,
//       populate: populateFields,
//     });

//     // ───────────────────── Add role name (mainly for DC) ─────────────────────
//     if (callerRoleName === "DC" || callerRoleName === "DEPUTY_COMMISSIONER") {
//       const roleDoc = await Role.findOne().lean();
//       const roleMap = new Map();
//       roleDoc?.roles?.forEach((r) => roleMap.set(r._id.toString(), r.name));

//       result.data = result.data.map((user) => {
//         const u = user.toObject();
//         u.role = {
//           id: u.roleId?.toString(),
//           name: roleMap.get(u.roleId?.toString()) || "Unknown",
//         };
//         // Optional: remove raw roleId from response
//         // delete u.roleId;
//         return u;
//       });
//     }

//     // Fill filtersApplied for DC style response
//     if (responseExtra.filtersApplied) {
//       responseExtra.filtersApplied = {
//         search: search || null,
//         roleId: roleId || null,
//         isActive: isActive !== undefined ? isActive : null,
//       };
//     }

//     return res.json({
//       success: true,
//       message: "Managed users fetched successfully",
//       ...responseExtra,
//       ...result,
//     });
//   } catch (error) {
//     console.error("getManagedUsers error:", error);
//     const status = error.message.includes("assigned") ? 400 : 500;
//     return res.status(status).json({
//       success: false,
//       message: "Error fetching managed users",
//       error: error.message,
//     });
//   }
// };

// module.exports = { getManagedUsers };

const User = require("../../models/usersModel");
const Role = require("../../models/roleModels");
const { paginate } = require("../../utils/pagination");
const mongoose = require("mongoose");

const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error("Role configuration not found");

  const role = roleConfig.roles.find((r) => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

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

const getManagedUsers = async (req, res) => {
  try {
    const caller = req.user;

    if (!caller?.roleId) {
      return res.status(403).json({ message: "Role not assigned" });
    }

    const callerRoleName = await getRoleNameById(caller.roleId);

    // Default values
    let baseQuery = {};
    let allowedFilters = { search: false, roleId: false, isActive: false };
    let selectFields = "name username phone zilaId tehsilId mcId isActive";
    let populateFields = [
      { path: "zilaId", select: "name" },
      { path: "tehsilId", select: "name" },
      { path: "mcId", select: "name" },
    ];

    switch (callerRoleName) {
      case "DC":
      case "DEPUTY_COMMISSIONER": {
        if (!caller.zilaId) {
          return res
            .status(400)
            .json({ message: "District not assigned to DC" });
        }

        const excludeRoleIds = await Promise.all([
          getRoleId("USER"),
          getRoleId("DC"),
        ]);

        baseQuery = {
          zilaId: caller.zilaId,
          roleId: { $nin: excludeRoleIds },
          _id: { $ne: caller._id },
        };

        selectFields += " roleId";
        allowedFilters = { search: true, roleId: true, isActive: true };
        break;
      }

      case "AC":
      case "ASSISTANT_COMMISIONER": {
        if (!caller.tehsilId) {
          return res.status(400).json({ message: "Tehsil not assigned to AC" });
        }

        const subordinateRoleIds = await Promise.all([
          getRoleId("MC_CO"),
          getRoleId("MC_EMPLOYEE"),
        ]);

        baseQuery = {
          tehsilId: caller.tehsilId,
          roleId: { $in: subordinateRoleIds },
        };

        allowedFilters = { search: true, isActive: true };
        break;
      }

      case "MC_CO":
      case "MUNICIPAL_COMMITTEE_CO": {
        if (!caller.tehsilId || !caller.mcId) {
          return res
            .status(400)
            .json({ message: "Tehsil/MC not assigned to MC_CO" });
        }

        const employeeRoleId = await getRoleId("MC_EMPLOYEE");

        baseQuery = {
          tehsilId: caller.tehsilId,
          mcId: caller.mcId,
          roleId: employeeRoleId,
        };

        allowedFilters = { search: true, isActive: true };
        break;
      }

      case "DISTRICT_COUNCIL_OFFICER":
      case "DCO": {
        const employeeRoleId = await getRoleId("DISTRICT_COUNCIL_EMPLOYEE");

        baseQuery = {
          roleId: employeeRoleId,
          zilaId: caller.zilaId,
        };

        allowedFilters = { search: true, isActive: true };
        break;
      }

      default:
        return res.status(403).json({
          message: "Your role is not authorized to view managed users",
        });
    }

    // ── Apply common filters ─────────────────────────────────────────────
    const { search, roleId, isActive } = req.query;

    let finalQuery = { ...baseQuery };

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

    // ── Pagination ───────────────────────────────────────────────────────
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      query: finalQuery,
      model: User,
      page,
      limit,
      sort: { createdAt: -1 },
      select: selectFields,
      populate: populateFields,
    });

    // ── Add role name for DC ─────────────────────────────────────────────
    let enhancedData = result.data;
    if (["DC", "DEPUTY_COMMISSIONER"].includes(callerRoleName)) {
      const roleDoc = await Role.findOne().lean();
      const roleMap = new Map(
        roleDoc?.roles?.map((r) => [r._id.toString(), r.name])
      );

      enhancedData = result.data.map((user) => {
        const u = user.toObject();
        u.role = {
          id: u.roleId?.toString(),
          name: roleMap.get(u.roleId?.toString()) || "Unknown",
        };
        // delete u.roleId; // optional
        return u;
      });
    }

    // ── Prepare response with applied filters ────────────────────────────
    const appliedFilters = {
      search: allowedFilters.search && search?.trim() ? search.trim() : null,
      roleId:
        allowedFilters.roleId && roleId && roleId !== "ALL" ? roleId : null,
      isActive:
        allowedFilters.isActive && isActive !== undefined && isActive !== ""
          ? isActive === "true"
          : null,
    };

    return res.json({
      success: true,
      message: "Managed users fetched successfully",
      appliedFilters,
      data: enhancedData,
      pagination: {
        ...result.pagination,
        currentPage: page,
        itemsPerPage: limit,
      },
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
