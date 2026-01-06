const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getComplaintsForDCO,
} = require("../Controllers/districtCouncilOfficer/districtCouncilUser");

// READ
router.get("/dco/get-complaints", authMiddleware, getComplaintsForDCO);

module.exports = router;
