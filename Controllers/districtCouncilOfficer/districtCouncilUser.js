const complaint = require("../../models/complaintModel");
const districtCouncilModel = require("../../models/DistrictCouncilModel");
const { paginate } = require("../../utils/pagination");

const getComplaintsForDCO = async (req, res) => {
  try {
    // Base filter: only Village area type for DCO
    const baseQuery = { areaType: "Village" };

    // Build dynamic filter query
    const filterQuery = { ...baseQuery };

    // Optional filters from req.query
    if (req.query.status) {
      filterQuery.status = req.query.status;
    }

    if (req.query.categoryId) {
      filterQuery.categoryId = req.query.categoryId;
    }

    // Text search in title and description (partial, case-insensitive)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filterQuery.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Populate useful fields
    const populateOptions = [
      { path: "categoryId", select: "name" }, // Assuming ComplaintCategory has 'name'
      { path: "createdByVolunteerId", select: "name phone" },
      { path: "zilaId", select: "name" },
      { path: "tehsilId", select: "name" },
      { path: "districtCouncilId", select: "name" },
      { path: "assignedToUserId", select: "name phone" },
    ];

    // Use the reusable paginate function
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
      ...result,
    });
  } catch (error) {
    console.error("Error in getComplaintsForDCO:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching complaints",
      error: error.message,
    });
  }
};

module.exports = { getComplaintsForDCO };
