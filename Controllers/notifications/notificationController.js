// controllers/notificationController.js
const Notification = require("../../models/notificationModel");

const getUserNotifications = async (req, res) => {
  const userId = req.user.id;

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("complaintId", "title description locationName areaType status")
    .lean();

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
};

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
