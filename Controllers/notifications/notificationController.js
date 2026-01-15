// controllers/notificationController.js
const Notification = require("../../models/notificationModel");

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  const userId = req.user.id; // from your auth middleware

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 }) // newest first
    .limit(50) // reasonable limit - add pagination later if needed
    .populate("complaintId", "title description locationName areaType status") // optional: enrich with complaint info
    .lean();

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
};

// @desc    Mark all notifications as read for current user
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
};

module.exports = {
  getUserNotifications,
  markAllAsRead,
  // you can add more later: getSingle, delete, etc.
};
