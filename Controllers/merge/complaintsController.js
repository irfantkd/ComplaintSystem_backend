// controllers/complaintController.js
const Complaint = require("../../models/complaintModel");
const User = require("../../models/usersModel");
const { paginate } = require("../../utils/pagination");
const Role = require("../../models/roleModels");

// Helper to determine base query + population based on role
async function getJurisdictionFilterAndPopulate(user) {
  const roleName = await getRoleNameById(user.roleId);

  const result = {
    baseQuery: {},
    populate: [],
    specialActions: null,
    extraResponse: {},
    supportsAreaTypeFilter: false, // most roles don't need/support this
  };

  switch (roleName) {
    // ─────────────── Assistant Commissioner (AC) ───────────────
    case "AC":
    case "ASSISTANT_COMMISSIONER":
      if (!user.tehsilId) {
        throw new Error("Tehsil not assigned to this Assistant Commissioner");
      }

      result.baseQuery = {
        tehsilId: user.tehsilId,
      };

      // AC can see both City and Village complaints in his tehsil
      result.supportsAreaTypeFilter = true;

      result.specialActions = async (query) => {
        await Complaint.updateMany(
          { ...query, seen: false },
          { $set: { seen: true, updatedAt: new Date() } }
        );
      };

      result.populate = [
        { path: "createdByVolunteerId", select: "name username" },
        { path: "categoryId", select: "name" },
        { path: "assignedToUserId", select: "name username roleId" },
        // Optional: also useful for AC
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
      ];

      result.extraResponse = {
        requestedBy: {
          userId: user._id,
          role: "AC",
          tehsilId: user.tehsilId,
        },
        filtersApplied: {}, // will be filled later
      };
      break;

    // ─────────────── MC Chief Officer ───────────────
    case "MC_CO":
    case "MUNICIPAL_COMMITTEE_CO":
      if (!user.tehsilId) {
        throw new Error("Tehsil not assigned to this MC_CO user");
      }

      result.baseQuery = {
        areaType: "City",
        tehsilId: user.tehsilId,
      };

      result.populate = [
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
        { path: "assignedToUserId", select: "name phone" },
      ];

      result.extraResponse = {
        requestedBy: {
          userId: user._id,
          role: "MC_CO",
          tehsilId: user.tehsilId,
        },
      };
      break;

    // ─────────────── Deputy Commissioner (DC) ───────────────
    case "DC":
    case "DEPUTY_COMMISSIONER":
      if (!user.zilaId) {
        throw new Error("District (zila) not assigned to this DC");
      }

      result.baseQuery = { zilaId: user.zilaId };

      result.specialActions = async (query) => {
        await Complaint.updateMany(
          { ...query, seen: false },
          { $set: { seen: true, updatedAt: new Date() } }
        );
      };

      result.populate = [
        { path: "createdByVolunteerId", select: "name username" },
        { path: "categoryId", select: "name" },
      ];

      result.extraResponse = {
        filtersApplied: {},
      };
      break;

    // ─────────────── District Council Officer ───────────────
    case "DISTRICT_COUNCIL_OFFICER":
    case "DCO":
      result.baseQuery = { areaType: "Village" };

      result.populate = [
        { path: "categoryId", select: "name" },
        { path: "createdByVolunteerId", select: "name phone" },
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
        { path: "districtCouncilId", select: "name" },
        { path: "assignedToUserId", select: "name phone" },
      ];

      result.extraResponse = {
        requestedBy: {
          userId: user._id,
          role: "DISTRICT_COUNCIL_OFFICER",
        },
      };
      break;

    default:
      throw new Error("Your role does not have permission to view complaints");
  }

  return result;
}

// ────────────────────────────────────────────────────────────────
// Main endpoint
// GET /api/complaints/my-area
// ────────────────────────────────────────────────────────────────
const getMyJurisdictionComplaints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "roleId zilaId tehsilId mcId"
    );

    if (!user?.roleId) {
      return res.status(403).json({ message: "Role not assigned" });
    }
    console.log(user, "user from the controller");
    const config = await getJurisdictionFilterAndPopulate(user);

    // Build final query
    let filterQuery = { ...config.baseQuery };

    // Common filters
    if (req.query.search?.trim()) {
      const rx = new RegExp(req.query.search.trim(), "i");
      filterQuery.$or = [{ title: rx }, { description: rx }];
    }

    if (req.query.status && req.query.status !== "ALL") {
      filterQuery.status = req.query.status;
    }

    // Category handling (different field names!)
    const category = req.query.category || req.query.categoryId;
    if (category) {
      if (
        ["MC_CO", "MUNICIPAL_COMMITTEE_CO"].includes(
          await getRoleNameById(user.roleId)
        )
      ) {
        filterQuery.category = new RegExp(category.trim(), "i"); // ← string search
      } else {
        filterQuery.categoryId = category; // ← ObjectId
      }
    }

    // Date range
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

    // Run special actions (mainly for DC - mark as seen)
    if (config.specialActions) {
      await config.specialActions(filterQuery);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      query: filterQuery,
      model: Complaint,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: config.populate,
    });

    // Prepare response
    const response = {
      success: true,
      message: "Complaints fetched successfully",
      ...config.extraResponse,
      ...result,
    };

    // Fill filtersApplied for DC style response
    if (response.filtersApplied) {
      response.filtersApplied = {
        search: req.query.search || null,
        status: req.query.status || null,
        categoryId: req.query.categoryId || req.query.category || null,
        dateRange:
          req.query.startDate || req.query.endDate
            ? { startDate: req.query.startDate, endDate: req.query.endDate }
            : null,
      };
    }

    return res.json(response);
  } catch (error) {
    console.error("getMyJurisdictionComplaints error:", error);
    const status =
      error.message.includes("access") || error.message.includes("assigned")
        ? 403
        : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error while fetching complaints",
    });
  }
};

let roleCache = null;

async function getRoleNameById(roleId) {
  if (!roleCache) {
    const config = await Role.findOne().lean();
    if (!config) throw new Error("Role configuration document not found");

    roleCache = {};
    for (const r of config.roles) {
      roleCache[r._id.toString()] = r.name;
    }
  }

  return roleCache[roleId.toString()] || null;
}

module.exports = {
  getMyJurisdictionComplaints,
};
