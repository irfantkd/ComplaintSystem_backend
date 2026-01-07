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
const {assignMCToCoo} = require("../controllers/dcControllers/mcController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getAllMcForDc,
  getMcByIdForDc,
  deleteMc,
  updateMcForDc,
} = require("../Controllers/dcControllers/mcController");

router.post("/dc/createUser", authMiddleware, createUser);
router.get("/dc/complaints", authMiddleware, getComplaintsForDC);

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
// router.post('/dc/create-user',authMiddleware, createUserForDc);
router.post('/dc/create-mc',authMiddleware, createMC);
// router.post('/dc/assign-mc-to-coo',authMiddleware, assignMCToCoo);
module.exports = router;

