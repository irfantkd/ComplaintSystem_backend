const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const {
  createTehsil,
  getAllTehsils,
  getTehsilById,
  updateTehsil,
  deleteTehsil,
  getAllZilas,
} = require('../Controllers/tehsilController');


router.post('/tehsil/create', authMiddleware, createTehsil);
router.get('/tehsil/all', authMiddleware, getAllTehsils);
router.get('/tehsil/:id', authMiddleware, getTehsilById);
router.patch('/tehsil/:id', authMiddleware, updateTehsil);
router.delete('/tehsil/:id', authMiddleware, deleteTehsil);
router.get('/zila/all', authMiddleware, getAllZilas);

module.exports = router;