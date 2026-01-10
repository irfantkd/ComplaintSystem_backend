const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware"); 
const { 
  createComplaint, 
  getComplainsOfUSER,
  updateComplaint,
  deleteComplaint,
  getUSERNotifications,
  getComplainOfUserById
} = require('../Controllers/VolunteerController');
const authMiddleware = require('../middlewares/authMiddleware');


router.post("/USER/create-complain", authMiddleware, upload.single("image"), createComplaint);
router.get("/USER/get-complains", authMiddleware, getComplainsOfUSER);
router.get("/USER/get-complains/:ComplaintId" , authMiddleware , getComplainOfUserById)
router.put("/USER/complaints/:complaintId/update", authMiddleware, updateComplaint);
router.delete("/USER/complaints/:complaintId/delete", authMiddleware, deleteComplaint);
router.get("/USER/notifications", authMiddleware, getUSERNotifications);


module.exports = router;