/**
 * Cart Routes
 * -----------
 * All routes require authentication.
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');

// Middleware
const { isAuthenticated } = require('../middleware/auth');

// All cart routes require authentication
router.use(isAuthenticated);

// ==========================================
// CART ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: User's cart data
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to add
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Insufficient stock or invalid input
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router
  .route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

/**
 * @swagger
 * /api/v1/cart/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID (not product ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 *       404:
 *         description: Item not found in cart
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart
 *       404:
 *         description: Item not found
 */
router
  .route('/:itemId')
  .put(updateCartItem)
  .delete(removeFromCart);

module.exports = router;
