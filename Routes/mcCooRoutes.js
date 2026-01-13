const express = require("express");
const router = express.Router();
const {
  getComplaintsForMcCoo,
  getComplaintByIdForMcCoo, // ← Added
  getMcEmployees,
  assignTaskToMcEmployee,
  approveComplaintByMcCoo,
  rejectComplaintByMcCoo,
  checkIsMcCoo,
} = require("../Controllers/municipalComitteCEO/mcCooController");
const authMiddleware = require("../middlewares/authMiddleware");

// MC COO Routes
router.get("/mc-coo/complaints", authMiddleware, getComplaintsForMcCoo);
router.get("/mc-coo/complaints/:complaintId", authMiddleware, getComplaintByIdForMcCoo); // ← Added
router.get("/mc-coo/employees", authMiddleware, getMcEmployees);
router.post("/mc-coo/assign-task", authMiddleware, assignTaskToMcEmployee);
router.patch("/mc-coo/approve-complain", authMiddleware, approveComplaintByMcCoo);
router.patch("/mc-coo/reject-complain", authMiddleware, rejectComplaintByMcCoo);

module.exports = router;