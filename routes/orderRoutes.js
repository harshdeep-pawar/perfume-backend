/**
 * Order Routes
 * ------------
 * Private: create order, get my orders, get single order
 * Admin: get all orders, update status, delete order
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController');

// Middleware
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');

// Validators
const { createOrderValidation, updateOrderStatusValidation } = require('../validations/orderValidation');
const validate = require('../validations/validate');

// All order routes require authentication
router.use(isAuthenticated);

// ==========================================
// USER ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderItems, shippingAddress]
 *             properties:
 *               orderItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   pinCode:
 *                     type: string
 *                   phone:
 *                     type: string
 *               paymentInfo:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [card, upi, cod, netbanking]
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Validation error or insufficient stock
 */
router.post('/', createOrderValidation, validate, createOrder);

/**
 * @swagger
 * /api/v1/orders/me:
 *   get:
 *     summary: Get logged-in user's order history
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: User's orders
 */
router.get('/me', getMyOrders);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get single order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.get('/:id', getOrder);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/orders/admin/all:
 *   get:
 *     summary: Get all orders with revenue (Admin only)
 *     tags: [Admin - Orders]
 *     responses:
 *       200:
 *         description: All orders with total revenue
 */
router.get('/admin/all', authorizeRoles('admin'), getAllOrders);

/**
 * @swagger
 * /api/v1/orders/admin/{id}:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *   delete:
 *     summary: Delete an order (Admin only)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted
 */
router
  .route('/admin/:id')
  .put(authorizeRoles('admin'), updateOrderStatusValidation, validate, updateOrderStatus)
  .delete(authorizeRoles('admin'), deleteOrder);

module.exports = router;
