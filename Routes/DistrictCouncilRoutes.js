const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  createDistrictCouncil,
  getAllDistrictCouncils,
  getDistrictCouncilById,
  updateDistrictCouncil,
  deleteDistrictCouncil,
  assignOfficerToCouncil,
  addEmployeeToCouncil,
  removeEmployeeFromCouncil,
} = require("../Controllers/dcControllers/DistrictCouncilController");

router.post("/district-council/create", authMiddleware, createDistrictCouncil);
router.get("/district-council/all", authMiddleware, getAllDistrictCouncils);
router.get("/district-council/:id", authMiddleware, getDistrictCouncilById);
router.patch("/district-council/:id", authMiddleware, updateDistrictCouncil);
router.delete("/district-council/:id", authMiddleware, deleteDistrictCouncil);
router.patch(
  "/district-council/:councilId/assign-officer",
  authMiddleware,
  assignOfficerToCouncil
);
router.post(
  "/district-council/:councilId/add-employee",
  authMiddleware,
  addEmployeeToCouncil
);
router.delete(
  "/district-council/:councilId/employee/:employeeId",
  authMiddleware,
  removeEmployeeFromCouncil
);

module.exports = router;
