const express = require("express");
const router = express.Router();
const {
  getComplaintsForMcCoo,
  getMcEmployees,
  assignTaskToMcEmployee,
  updateComplaintStatusByMcCoo,
  checkIsMcCoo,
} = require("../Controllers/municipalComitteCEO/mcCooController");
const authMiddleware = require("../middlewares/authMiddleware"); // your JWT middleware

// MC COO Routes
router.get(
  "/mc-coo/complaints",
  authMiddleware,

  getComplaintsForMcCoo
);
router.get("/mc-coo/employees", authMiddleware, getMcEmployees);
router.post(
  "/mc-coo/assign-task",
  authMiddleware,

  assignTaskToMcEmployee
);
router.post(
  "/mc-coo/update-status",
  authMiddleware,

  updateComplaintStatusByMcCoo
);
module.exports = router;
