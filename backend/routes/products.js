const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, getCategories, getFeatured, getHomeSections,
  createCategory, updateCategory, deleteCategory
} = require('../controllers/productController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { productValidator } = require('../middleware/validate');

router.get('/', getProducts);
router.get('/featured', getFeatured);
router.get('/categories', getCategories);
router.get('/home-sections', getHomeSections);
router.post('/categories', authenticate, isAdmin, createCategory);
router.put('/categories/:id', authenticate, isAdmin, updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, deleteCategory);
router.get('/:id', getProduct);
router.post('/', authenticate, isAdmin, productValidator, createProduct);
router.put('/:id', authenticate, isAdmin, productValidator, updateProduct);
router.delete('/:id', authenticate, isAdmin, deleteProduct);

module.exports = router;
