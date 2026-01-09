const express = require("express");
const router = express.Router();
const {
  createMC,
  deleteUserForDC,
  getComplaintsForDC,
  updateUserStatusForDC,
  updateUserDetails,
  createUser,
  updateStatusForDC,
  getAllUsersForDC,
  deleteComplaintForDC,
} = require("../Controllers/dcControllers/dcController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getAllMcForDc,
  getMcByIdForDc,
  deleteMc,
  updateMcForDc,
} = require('../Controllers/dcControllers/mcController')
const { getUsersByRole } = require("../Controllers/usersFetchController")

router.post("/dc/createUser", authMiddleware, createUser);
router.get("/dc/complaints", authMiddleware, getComplaintsForDC);

router.post('/dc/create-mc',authMiddleware, createMC);
router.get("/dc/all/mcs", authMiddleware, getAllMcForDc);
router.get("/dc/mc/:mcId/single", authMiddleware, getMcByIdForDc);
router.delete("/dc/mc/:mcId/delete", authMiddleware, deleteMc);
router.put("/dc/mc/:mcId/update", authMiddleware, updateMcForDc);

router.delete('/dc/complaints/:complaintId',authMiddleware, deleteComplaintForDC);
router.put('/dc/complaints/:complaintId',authMiddleware, updateStatusForDC);
router.put('/dc/users/:userId/status', authMiddleware, updateUserStatusForDC);
router.get('/dc/users',authMiddleware, getAllUsersForDC);
router.put('/dc/users/:userId/update',authMiddleware,updateUserDetails)
router.delete('/dc/users/:userId/delete',authMiddleware,deleteUserForDC)
router.get("/dc/users/by-role",authMiddleware,getUsersByRole);
// router.post('/dc/create-user',authMiddleware, createUserForDc);

// router.post('/dc/assign-mc-to-coo',authMiddleware, assignMCToCoo);
module.exports = router;

