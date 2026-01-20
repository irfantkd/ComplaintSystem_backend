const express = require("express");
const router = express.Router();
const complaintCategoryController = require("../Controllers/complainCategoryControllers");

router.post(
  "/complains/category/create",
  complaintCategoryController.createCategory
);
router.get(
  "/complains/category/get",
  complaintCategoryController.getAllCategories
);
router.get(
  "/complains/category/get/:id",
  complaintCategoryController.getCategoryById
);
router.put(
  "/complains/category/update/:id",
  complaintCategoryController.updateCategory
);
router.delete(
  "/complains/category/delete/:id",
  complaintCategoryController.deleteCategory
);
router.patch(
  "/complains/category/deactivate/:id",
  complaintCategoryController.deactivateCategory
);

module.exports = router;
