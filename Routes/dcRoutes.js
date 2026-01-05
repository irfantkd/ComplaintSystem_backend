const express = require('express');
const router = express.Router();
const { getComplaintsForDC , createUser} = require('../Controllers/dcController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/dc/createUser',authMiddleware,createUser)
router.get('/dc/complaints',authMiddleware, getComplaintsForDC);


module.exports = router;