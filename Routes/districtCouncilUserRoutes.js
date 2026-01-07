const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getComplaintsForDCO,
  getUserForDco,
  assignTaskToEmployee,
  completeComplaintByDCO,
} = require("../Controllers/districtCouncilOfficer/districtCouncilUser");

// READ
router.get("/dco/get-complaints", authMiddleware, getComplaintsForDCO);
router.get("/dco/get-employees", authMiddleware, getUserForDco);
router.post("/dco/assign-task", authMiddleware, assignTaskToEmployee);
router.post("/dco/complete-complaint", authMiddleware, completeComplaintByDCO);

module.exports = router;
