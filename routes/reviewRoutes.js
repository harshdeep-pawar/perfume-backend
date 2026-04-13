/**
 * Review Routes
 * -------------
 * Public: get product reviews
 * Private: add/update review, delete review
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  createOrUpdateReview,
  getProductReviews,
  deleteReview,
} = require('../controllers/reviewController');

// Middleware
const { isAuthenticated } = require('../middleware/auth');

// Validators
const { reviewValidation } = require('../validations/reviewValidation');
const validate = require('../validations/validate');

// ==========================================
// REVIEW ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Add or update a product review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, rating, comment]
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to review
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review added/updated
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Review not found
 */
router
  .route('/')
  .post(isAuthenticated, reviewValidation, validate, createOrUpdateReview)
  .delete(isAuthenticated, deleteReview);

/**
 * @swagger
 * /api/v1/reviews/{productId}:
 *   get:
 *     summary: Get all reviews for a product
 *     tags: [Reviews]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product reviews
 *       404:
 *         description: Product not found
 */
router.get('/:productId', getProductReviews);

module.exports = router;
