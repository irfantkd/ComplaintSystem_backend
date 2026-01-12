const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getComplaintsForDCO,
  getUserForDco,
  assignTaskToEmployee,
  updateComplaintStatus,
} = require("../Controllers/districtCouncilOfficer/districtCouncilUser");

// router.get("/dco/get-complaints", authMiddleware, getComplaintsForDCO);
router.get("/dco/get-employees", authMiddleware, getUserForDco);
router.post("/dco/assign-task", authMiddleware, assignTaskToEmployee);
router.post("/dco/update-status", authMiddleware, updateComplaintStatus);

module.exports = router;
