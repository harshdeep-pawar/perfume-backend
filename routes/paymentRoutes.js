/**
 * Payment Routes
 * --------------
 * All routes require authentication.
 *
 * Flow:
 * 1. GET  /key         → Get Razorpay public key for frontend
 * 2. POST /create      → Create Razorpay order for an existing app order
 * 3. POST /verify      → Verify payment after Razorpay checkout
 * 4. GET  /:orderId    → Get payment status for an order
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  getRazorpayKey,
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
} = require('../controllers/paymentController');

// Middleware
const { isAuthenticated } = require('../middleware/auth');

// Validators
const { createPaymentValidation, verifyPaymentValidation } = require('../validations/paymentValidation');
const validate = require('../validations/validate');

// All payment routes require authentication
router.use(isAuthenticated);

// ==========================================
// PAYMENT ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/payments/key:
 *   get:
 *     summary: Get Razorpay API key for frontend checkout
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Razorpay public key
 *       503:
 *         description: Razorpay not configured
 */
router.get('/key', getRazorpayKey);

/**
 * @swagger
 * /api/v1/payments/create:
 *   post:
 *     summary: Create Razorpay order for payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: App order ID to pay for
 *     responses:
 *       200:
 *         description: Razorpay order created
 *       400:
 *         description: Already paid or invalid payment method
 *       404:
 *         description: Order not found
 */
router.post('/create', createPaymentValidation, validate, createPaymentOrder);

/**
 * @swagger
 * /api/v1/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment after checkout
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               orderId:
 *                 type: string
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and order updated
 *       400:
 *         description: Signature verification failed
 */
router.post('/verify', verifyPaymentValidation, validate, verifyPayment);

/**
 * @swagger
 * /api/v1/payments/{orderId}:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Order not found
 */
router.get('/:orderId', getPaymentStatus);

module.exports = router;
