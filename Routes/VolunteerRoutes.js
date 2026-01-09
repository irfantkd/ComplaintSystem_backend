const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware"); 
const { createComplaint , getComplainsOfVolunteer } = require('../Controllers/VolunteerController')
const authMiddleware = require('../middlewares/authMiddleware')


router.post("/volunteer/create-complain", authMiddleware, upload.single("image"), createComplaint);
router.get("/volunteer/get-complains",authMiddleware, getComplainsOfVolunteer)


module.exports = router;
