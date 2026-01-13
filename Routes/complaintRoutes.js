const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { 
  getMyJurisdictionComplaints,
  getComplaintById // ← Import this
} = require('../Controllers/merge/complaintsController')
const { getManagedUsers } = require("../Controllers/merge/userController");

router.get("/complaints/my-area", authMiddleware, getMyJurisdictionComplaints);
router.get("/users/managed-employees", authMiddleware, getManagedUsers);
router.get("/complaints/:complaintId", authMiddleware, getComplaintById);

module.exports = router;
