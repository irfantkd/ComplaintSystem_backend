const express = require('express');
const router = express.Router();
const complaintCategoryController = require('../Controllers/complainCategoryControllers')



router.post('/complains/create', complaintCategoryController.createCategory);
router.get('/complains/get', complaintCategoryController.getAllCategories);
router.get('complains/get/:id', complaintCategoryController.getCategoryById);
router.put('complains/update/:id', complaintCategoryController.updateCategory);
router.delete('complains/update/:id', complaintCategoryController.deleteCategory);
router.patch('complains/deactivate/:id', complaintCategoryController.deactivateCategory);

module.exports = router;

