const express = require('express');
const router = express.Router();
const { getComplaintsForDC } = require('../Controllers/dcController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/dc/complaints',authMiddleware, getComplaintsForDC);

module.exports = router;