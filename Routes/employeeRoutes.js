const express = require("express");
const router = express.Router();

const {
  getComplaintsForEmployee,
} = require("../Controllers/employeeController/employee");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/employee/complaints", authMiddleware, getComplaintsForEmployee);

module.exports = router;
