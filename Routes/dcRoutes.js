const express = require("express");
const router = express.Router();
const {
  getComplaintsForDC,
  deleteComplaintForDc,
  updateStatusForDc,
  updateUserStatusForDC,
  getAllUsers,
  updateUserDetails,
  createUser,
} = require("../Controllers/dcControllers/dcController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  createMC,
  getAllMcForDc,
  getMcByIdForDc,
  deleteMc,
  updateMcForDc,
} = require("../Controllers/dcControllers/mcController");

router.post("/dc/createUser", authMiddleware, createUser);
router.get("/dc/complaints", authMiddleware, getComplaintsForDC);
router.delete(
  "/dc/complaints/:complaintId",
  authMiddleware,
  deleteComplaintForDc
);
router.put("/dc/complaints/:complaintId", authMiddleware, updateStatusForDc);
router.put("/dc/users/:userId/status", authMiddleware, updateUserStatusForDC);
router.get("/dc/users", authMiddleware, getAllUsers);
router.put("/dc/users/:userId/update", authMiddleware, updateUserDetails);
router.post("/dc/create-mc", authMiddleware, createMC);
router.get("/dc/all/mcs", authMiddleware, getAllMcForDc);
router.get("/dc/mc/:mcId/single", authMiddleware, getMcByIdForDc);
router.delete("/dc/mc/:mcId/delete", authMiddleware, deleteMc);
router.put("/dc/mc/:mcId/update", authMiddleware, updateMcForDc);

module.exports = router;
