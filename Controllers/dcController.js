// controllers/complaintController.js

const Complaint = require("../models/complaintModel");
const { paginate } = require("../utils/pagination");

const getComplaintsForDC = async (req, res) => {
  try {
    const dcUser = req.user;

    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const {
      search, // Search in title or description
      status, // e.g., SUBMITTED, IN_PROGRESS, RESOLVED
      categoryId, // Filter by category
      startDate, // YYYY-MM-DD
      endDate, // YYYY-MM-DD
    } = req.query;

    // Build dynamic query
    let query = { zilaId: dcUser.zilaId };

    // 1. Text Search (title or description)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i"); // case-insensitive
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // 2. Filter by status
    if (status && status !== "ALL") {
      query.status = status;
    }

    // 3. Filter by category
    if (categoryId && categoryId !== "") {
      query.categoryId = categoryId;
    }

    // 4. Date range filter (createdAt)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate); // Greater than or equal
      }
      if (endDate) {
        // Set end of day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    // Important: Only mark filtered results as seen if they were unseen
    const updateResult = await Complaint.updateMany(
      {
        ...query, // Apply same filters
        seen: false,
      },
      { $set: { seen: true, updatedAt: new Date() } }
    );

    // Then: Fetch paginated + filtered results
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
      unseenMarkedAsSeen: updateResult.modifiedCount,
      ...result, // data + pagination
    });
  } catch (error) {
    console.error("Error fetching complaints for DC:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { getComplaintsForDC };
