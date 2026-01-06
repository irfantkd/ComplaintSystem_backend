const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware"); 
const { createComplaint } = require('../Controllers/VolunteerController')
const authMiddleware = require('../middlewares/authMiddleware')


router.post("/volunteer/create-complain", authMiddleware, upload.single("image"), createComplaint);


module.exports = router;
