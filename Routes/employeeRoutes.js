const express = require("express");
const router = express.Router();
const {
  getAssignedComplaints,
  getComplaintDetails,
  submitResolutionWithImage,
  getEmployeeStats,
} = require('../Controllers/employeeController')

const  upload  = require('../middlewares/uploadMiddleware')
const authMiddleware = require('../middlewares/authMiddleware')


router.get("/employee/complaints",authMiddleware,getAssignedComplaints);
router.get("/employee/complaints/:id", authMiddleware,getComplaintDetails);
router.post("/employee/complaints/:id/resolution-image",authMiddleware,upload.single("resolutionImage"),submitResolutionWithImage);
router.get("/employee/dashboard/stats", authMiddleware,getEmployeeStats);

module.exports = router;