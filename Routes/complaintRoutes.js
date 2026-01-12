const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  getMyJurisdictionComplaints,
} = require("../Controllers/merge/complaintsController");
const { getManagedUsers } = require("../Controllers/merge/userController");

router.get("/complaints/my-area", authMiddleware, getMyJurisdictionComplaints);
router.get("/users/managed-employees", authMiddleware, getManagedUsers);

module.exports = router;
