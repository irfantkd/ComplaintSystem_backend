const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const {
  createComplaint,
  getComplainsOfUSER,
} = require("../Controllers/VolunteerController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
  "/volunteer/create-complain",
  authMiddleware,
  upload.single("image"),
  createComplaint
);
router.get("/volunteer/get-complains", authMiddleware, getComplainsOfUSER);

module.exports = router;
