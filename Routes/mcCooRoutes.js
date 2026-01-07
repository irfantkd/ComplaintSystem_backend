const {
  getComplaintsForMcCoo,
  getMcEmployees,
  assignTaskToMcEmployee,
  updateComplaintStatusByMcCoo,
  checkIsMcCoo,
} = require("../controllers/mcCooController");
const { authMiddleware } = require("../middleware/authMiddleware"); // your JWT middleware

// MC COO Routes
router.get(
  "/mc-coo/complaints",
  authMiddleware,
  checkIsMcCoo,
  getComplaintsForMcCoo
);
router.get("/mc-coo/employees", authMiddleware, checkIsMcCoo, getMcEmployees);
router.post(
  "/mc-coo/assign-task",
  authMiddleware,
  checkIsMcCoo,
  assignTaskToMcEmployee
);
router.post(
  "/mc-coo/update-status",
  authMiddleware,
  checkIsMcCoo,
  updateComplaintStatusByMcCoo
);
