/**
 * Product Routes
 * --------------
 * Public: get all, get single (search, filter, sort, paginate)
 * Admin: create, update, delete products
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Middleware
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validators
const { createProductValidation, updateProductValidation } = require('../validations/productValidation');
const validate = require('../validations/validate');

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by product name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [eau-de-parfum, eau-de-toilette, eau-de-cologne, perfume-extract, body-mist, attar, unisex, men, women]
 *         description: Filter by category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: price[gte]
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: price[lte]
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: "Sort by field (e.g., price, -price, ratings)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of products with pagination
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get single product by ID
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProduct);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, brand, price, description, category, stock]
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [eau-de-parfum, eau-de-toilette, eau-de-cologne, perfume-extract, body-mist, attar, unisex, men, women]
 *               stock:
 *                 type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized
 */
router.post(
  '/',
  isAuthenticated,
  authorizeRoles('admin'),
  upload.array('images', 5),
  createProductValidation,
  validate,
  createProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
router
  .route('/:id')
  .put(
    isAuthenticated,
    authorizeRoles('admin'),
    upload.array('images', 5),
    updateProductValidation,
    validate,
    updateProduct
  )
  .delete(isAuthenticated, authorizeRoles('admin'), deleteProduct);

module.exports = router;
