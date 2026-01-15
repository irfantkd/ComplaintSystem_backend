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
    supportsAreaTypeFilter: false,
  };

  switch (roleName) {
    case "AC":
    case "ASSISTANT_COMMISSIONER":
      if (!user.tehsilId) {
        throw new Error("Tehsil not assigned to this Assistant Commissioner");
      }

      result.baseQuery = {
        tehsilId: user.tehsilId,
      };

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
        { path: "zilaId", select: "name" },
        { path: "tehsilId", select: "name" },
      ];

      result.extraResponse = {
        requestedBy: {
          userId: user._id,
          role: "AC",
          tehsilId: user.tehsilId,
        },
        filtersApplied: {},
      };
      break;

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
    { path: "zilaId", select: "name" },        // ← ADD THIS
    { path: "tehsilId", select: "name" },      // ← ADD THIS
    { path: "assignedToUserId", select: "name username roleId" }, // ← OPTIONAL: Add this too
  ];

  result.extraResponse = {
    filtersApplied: {},
  };
  break;

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

const getMyJurisdictionComplaints = async (req, res) => {
  try {
    // Step 1: Check user
    const user = await User.findById(req.user._id).select(
      "roleId zilaId tehsilId mcId"
    );

    console.log("========== DEBUG START ==========");
    console.log("1. User ID:", req.user._id);
    console.log("2. User found:", JSON.stringify(user, null, 2));

    if (!user?.roleId) {
      return res.status(403).json({ message: "Role not assigned" });
    }

    // Step 2: Get role name
    const roleName = await getRoleNameById(user.roleId);
    console.log("3. Role name:", roleName);

    // Step 3: Check what complaints exist in DB
    const allComplaints = await Complaint.countDocuments({});
    console.log("4. Total complaints in database:", allComplaints);

    // Step 4: Check complaints for this user's jurisdiction
    let jurisdictionQuery = {};
    if (user.zilaId) {
      jurisdictionQuery.zilaId = user.zilaId;
      const zilaComplaints = await Complaint.countDocuments(jurisdictionQuery);
      console.log("5. Complaints in user's zila:", zilaComplaints);
    }
    if (user.tehsilId) {
      jurisdictionQuery.tehsilId = user.tehsilId;
      const tehsilComplaints = await Complaint.countDocuments(jurisdictionQuery);
      console.log("6. Complaints in user's tehsil:", tehsilComplaints);
    }

    // Step 5: Get config
    const config = await getJurisdictionFilterAndPopulate(user);
    console.log("7. Config baseQuery:", JSON.stringify(config.baseQuery, null, 2));

    let filterQuery = { ...config.baseQuery };

    // Common filters
    if (req.query.search?.trim()) {
      const rx = new RegExp(req.query.search.trim(), "i");
      filterQuery.$or = [{ title: rx }, { description: rx }];
    }

    if (req.query.status && req.query.status !== "ALL") {
      filterQuery.status = req.query.status;
    }

    // Category handling
    const category = req.query.category || req.query.categoryId;
    if (category) {
      if (["MC_CO", "MUNICIPAL_COMMITTEE_CO"].includes(roleName)) {
        filterQuery.category = new RegExp(category.trim(), "i");
      } else {
        filterQuery.categoryId = category;
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

    console.log("8. Final filterQuery:", JSON.stringify(filterQuery, null, 2));
    console.log("9. Query params:", JSON.stringify(req.query, null, 2));

    // Count matching documents
    const matchingCount = await Complaint.countDocuments(filterQuery);
    console.log("10. Complaints matching filterQuery:", matchingCount);

    // If no complaints found, let's see what's actually in the DB
    if (matchingCount === 0) {
      const sampleComplaints = await Complaint.find({}).limit(3).lean();
      console.log("11. Sample complaints from DB:", JSON.stringify(sampleComplaints, null, 2));
    }

    // Run special actions
    if (config.specialActions) {
      await config.specialActions(filterQuery);
    }

    // Direct pagination query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log("12. Pagination - page:", page, "limit:", limit, "skip:", skip);

    const totalDocs = await Complaint.countDocuments(filterQuery);
    
    let complaintsQuery = Complaint.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Apply population
    if (config.populate && config.populate.length > 0) {
      config.populate.forEach(pop => {
        complaintsQuery = complaintsQuery.populate(pop);
      });
    }

    const complaints = await complaintsQuery.lean();
    console.log("13. Complaints fetched:", complaints.length);
    console.log("========== DEBUG END ==========");

    const totalPages = Math.ceil(totalDocs / limit);

    // Prepare response
    const response = {
      success: true,
      message: "Complaints fetched successfully",
      complaints: complaints,
      pagination: {
        page,
        limit,
        totalPages,
        totalDocs,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      ...config.extraResponse,
    };

    // Fill filtersApplied
    if (response.filtersApplied !== undefined) {
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
    console.error("Error stack:", error.stack);
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


const getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    // Step 1: Get user with jurisdiction data
    const user = await User.findById(req.user._id).select(
      "roleId zilaId tehsilId mcId"
    );

    if (!user?.roleId) {
      return res.status(403).json({ 
        success: false,
        message: "Role not assigned" 
      });
    }

    // Step 2: Get role-based configuration (jurisdiction filters & population)
    const config = await getJurisdictionFilterAndPopulate(user);
    
    // Step 3: Build query with jurisdiction validation
    const query = {
      _id: complaintId,
      ...config.baseQuery, // This adds zilaId/tehsilId/areaType based on role
    };

    console.log("Fetching complaint with query:", JSON.stringify(query, null, 2));

    // Step 4: Build and execute query with population
    let complaintQuery = Complaint.findOne(query);

    // Apply role-based population
    if (config.populate && config.populate.length > 0) {
      config.populate.forEach(pop => {
        complaintQuery = complaintQuery.populate(pop);
      });
    }

    const complaint = await complaintQuery.lean();

    // Step 5: Check if complaint exists and is accessible
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or you don't have permission to access it",
      });
    }

    // Step 6: Mark as seen if role has this action (DC, AC)
    if (config.specialActions && !complaint.seen) {
      await Complaint.updateOne(
        { _id: complaintId },
        { $set: { seen: true, updatedAt: new Date() } }
      );
      complaint.seen = true; // Update local object for response
    }

    // Step 7: Return response with role-specific data
    return res.json({
      success: true,
      message: "Complaint fetched successfully",
      complaint: complaint,
      ...config.extraResponse,
    });

  } catch (error) {
    console.error("getComplaintById error:", error);
    const status =
      error.message.includes("access") || error.message.includes("assigned")
        ? 403
        : 500;
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching complaint",
    });
  }
};

// Update module.exports
module.exports = {
  getMyJurisdictionComplaints,
  getComplaintById, // ← Add this
};

