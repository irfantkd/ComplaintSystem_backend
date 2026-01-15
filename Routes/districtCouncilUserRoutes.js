const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getUserForDco,
  assignTaskToEmployee,
  updateComplaintStatus,
  approveComplaintByDco,
  rejectComplaintByDco,
} = require("../Controllers/districtCouncilOfficer/districtCouncilUser");



router.get("/dco/employees",authMiddleware,getUserForDco);
router.post("/dco/complaints/assign",authMiddleware,assignTaskToEmployee);
router.post("/dco/complaints/update-status",authMiddleware,updateComplaintStatus);
router.patch("/dco/complaints/:complaintId/approve",authMiddleware,approveComplaintByDco);
router.patch("/dco/complaints/:complaintId/reject",authMiddleware,rejectComplaintByDco);

module.exports = router;
