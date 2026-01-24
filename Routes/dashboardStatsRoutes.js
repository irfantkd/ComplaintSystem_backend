const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware"); // your JWT middleware
const {
  getOverview,
  getRecentComplaints,
  getRecentActivity,
} = require("../Controllers/dashboardStats/dashboardStats");

router.get("/dashboard/overview", authMiddleware, getOverview);
router.get("/dashboard/recent-complaints", authMiddleware, getRecentComplaints);
router.get("/dashboard/recent-activity", authMiddleware, getRecentActivity);

module.exports = router;
