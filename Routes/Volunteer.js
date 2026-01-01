const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware"); 
const { uploadImage } = require('../Controllers/VolunteerController')


router.post("/upload", upload.single("image"), uploadImage);


module.exports = router;
