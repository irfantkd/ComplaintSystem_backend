const express = require('express');
const router = express.Router();
const { 
     getComplaintsForDC,
     deleteComplaintForDC,
     updateStatusForDC,
     updateUserStatusForDC,
     getAllUsersForDC,
     updateUserDetails,
     createMC,
     createUser,
     deleteUserForDC
 } = require('../Controllers/dcControllers/dcController');
const authMiddleware = require('../middlewares/authMiddleware');
const {assignMCToCoo} = require("../controllers/dcControllers/mcController");

router.post('/dc/createUser',authMiddleware,createUser)
router.get('/dc/complaints',authMiddleware, getComplaintsForDC);
router.delete('/dc/complaints/:complaintId',authMiddleware, deleteComplaintForDC);
router.put('/dc/complaints/:complaintId',authMiddleware, updateStatusForDC);
router.put('/dc/users/:userId/status', authMiddleware, updateUserStatusForDC);
router.get('/dc/users',authMiddleware, getAllUsersForDC);
router.put('/dc/users/:userId/update',authMiddleware,updateUserDetails)
router.delete('/dc/users/:userId/delete',authMiddleware,deleteUserForDC)
// router.post('/dc/create-user',authMiddleware, createUserForDc);
router.post('/dc/create-mc',authMiddleware, createMC);
router.post('/dc/assign-mc-to-coo',authMiddleware, assignMCToCoo);
module.exports = router;