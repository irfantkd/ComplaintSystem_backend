// routes/notificationRoutes.js  (create new file)
const express = require("express");
const router = express.Router();
const {
  getUserNotifications,
  markAllAsRead,
} = require("../Controllers/notifications/notificationController");

const authMiddleware = require("../middlewares/authMiddleware"); // your JWT/auth middleware

router.get("/notifications", authMiddleware, getUserNotifications);
router.patch("/notifications/read-all", authMiddleware, markAllAsRead);

module.exports = router;
