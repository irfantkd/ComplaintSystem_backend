const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const {
  createComplaint,
  getComplainsOfUSER,
  updateComplaint,
  deleteComplaint,
  getUSERNotifications,
  getComplainOfUserById,
  getUserStats,
} = require("../Controllers/VolunteerController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
  "/user/create-complain",
  authMiddleware,
  upload.single("image"),
  createComplaint
);
router.get("/user/get-complains", authMiddleware, getComplainsOfUSER);
router.get(
  "/user/get-complains/:ComplaintId",
  authMiddleware,
  getComplainOfUserById
);
router.put(
  "/user/complaints/:complaintId/update",
  authMiddleware,
  updateComplaint
);
router.delete(
  "/user/complaints/:complaintId/delete",
  authMiddleware,
  deleteComplaint
);
router.get("/user/notifications", authMiddleware, getUSERNotifications);
router.get("/user/stats", authMiddleware, getUserStats);

module.exports = router;
