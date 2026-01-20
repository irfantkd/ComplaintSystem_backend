const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { getZilla } = require("../Controllers/zilaController");

router.get("/get-zilla", authMiddleware, getZilla);

module.exports = router;
