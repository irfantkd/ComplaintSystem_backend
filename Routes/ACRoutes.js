const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getComplaintsForAC,
  approveResolution,
  rejectResolution,
  getACDashboardStats,
} = require('../Controllers/AcController')


router.get("/AC/complaints",authMiddleware,getComplaintsForAC);
router.post("/AC/complaints/:complaintId/approve",authMiddleware,approveResolution);
router.post("/AC/complaints/:complaintId/reject",authMiddleware,rejectResolution);
router.get("/AC/dashboard/stats",authMiddleware,getACDashboardStats);

module.exports = router;
