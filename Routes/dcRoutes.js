const express = require('express');
const router = express.Router();
const { getComplaintsForDC, deleteComplaintForDc,updateStatusForDc,updateUserStatusForDC,getAllUsers,updateUserDetails,createMC } = require('../Controllers/dcControllers/dcController');
const authMiddleware = require('../middlewares/authMiddleware');
const {assignMCToCoo} = require("../controllers/dcControllers/mcController")

router.get('/dc/complaints',authMiddleware, getComplaintsForDC);
router.delete('/dc/complaints/:complaintId',authMiddleware, deleteComplaintForDc);
router.put('/dc/complaints/:complaintId',authMiddleware, updateStatusForDc);
router.put('/dc/users/:userId/status', authMiddleware, updateUserStatusForDC);
router.get('/dc/users',authMiddleware, getAllUsers);
router.put('/dc/users/:userId/update',authMiddleware,updateUserDetails)
// router.post('/dc/create-user',authMiddleware, createUserForDc);
router.post('/dc/create-mc',authMiddleware, createMC);
router.post('/dc/assign-mc-to-coo',authMiddleware, assignMCToCoo);
module.exports = router;