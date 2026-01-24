const User = require("../../models/usersModel");
const { getRoleNameById } = require("../../utils/roleHelpers");

const { buildRoleBasedMatch } = require("../../utils/roleBasedFilters");

const { formatDistanceToNow } = require("date-fns");
const Complaint = require("../../models/complaintModel");
const Activity = require("../../models/activityModel");

// controllers/dashboardController.js
const getOverview = async (req, res) => {
  try {
    const user = req.user;

    if (!user) return res.status(401).json({ error: "Unauthorized" });
    let match = await buildRoleBasedMatch(user);

    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const twoMonthsAgoStart = new Date(
      today.getFullYear(),
      today.getMonth() - 2,
      1,
    );

    const pipeline = [
      { $match: { ...match, createdAt: { $gte: twoMonthsAgoStart } } },
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: thisMonthStart } } },
            { $group: { _id: null, total: { $sum: 1 } } },
          ],
          previous: [
            {
              $match: {
                createdAt: { $gte: lastMonthStart, $lt: thisMonthStart },
              },
            },
            { $group: { _id: null, total: { $sum: 1 } } },
          ],
          resolvedCurrent: [
            {
              $match: {
                createdAt: { $gte: thisMonthStart },
                status: { $in: ["resolved", "completed"] },
              },
            },
            { $count: "count" },
          ],
          pendingAll: [{ $match: { status: "pending" } }, { $count: "count" }],
        },
      },
    ];

    const [result] = await Complaint.aggregate(pipeline);

    const currTotal = result.current[0]?.total || 0;
    const prevTotal = result.previous[0]?.total || 0;
    const currResolved = result.resolvedCurrent[0]?.count || 0;
    const pending = result.pendingAll[0]?.count || 0;

    const totalChange =
      prevTotal === 0 ? 0 : ((currTotal - prevTotal) / prevTotal) * 100;
    // You can compute resolved %, pending %, etc. similarly

    const activeUsers = await User.countDocuments({
      isActive: true,
      ...match,
    });

    console.log(activeUsers, "active users");

    return res.status(200).json({
      success: true,
      message: "Overview data fetched successfully",

      data: {
        totalComplaints: currTotal,
        totalChange: totalChange.toFixed(0) + "%",
        pending,
        resolved: currResolved,
        activeUsers,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getRecentActivity = async (req, res) => {
  const user = req.user;
  const match = await buildRoleBasedMatch(user); // same as
  const notDc = await getRoleNameById(user.roleId.toString());
  if (notDc !== "DC") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log(notDc);

  const activities = await Activity.find(match)
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("performedBy", "name username role")
    .lean();

  const formatted = activities.map((act) => ({
    message: `${act.performedBy?.username} ${act.performedBy?.name} ${act.action}`,

    timeAgo: formatDistanceToNow(act.createdAt, { addSuffix: true }),
  }));

  res.status(200).json({
    success: true,
    message: "Recent activity fetched successfully",
    data: formatted,
  });
};

const getRecentComplaints = async (req, res) => {
  const user = req.user;
  const match = await buildRoleBasedMatch(user);

  const complaints = await Complaint.find(match)
    .sort({ createdAt: -1 })
    .limit(6)
    .select("title description status createdAt")
    .lean();

  const formatted = complaints.map((c) => ({
    id: c._id,
    number: c._id.toString().slice(-6), // or use custom counter
    title: c.title || c.description.slice(0, 60) + "...",
    status: c.status,
    timeAgo: formatDistanceToNow(c.createdAt, { addSuffix: true }),
    area: c.locationName || "Unknown",
  }));

  res.status(200).json({
    success: true,
    message: "Recent complaints fetched successfully",
    data: formatted,
  });
};

module.exports = {
  getRecentActivity,
  getRecentComplaints,
  getOverview,
};
