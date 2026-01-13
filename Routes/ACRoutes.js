const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {approveResolution,rejectResolution,getACDashboardStats,} = require("../Controllers/AcController");

// router.get("/ac/complaints", authMiddleware, getComplaintsForAC);
router.post("/ac/complaints/:complaintId/approve",authMiddleware,approveResolution);
router.post("/ac/complaints/:complaintId/reject",authMiddleware,rejectResolution);
router.get("/ac/dashboard/stats", authMiddleware, getACDashboardStats);

module.exports = router;
