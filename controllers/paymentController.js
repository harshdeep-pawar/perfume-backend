/**
 * Payment Controller
 * ------------------
 * Handles Razorpay payment lifecycle:
 * - Create Razorpay order for an existing order
 * - Verify payment after client-side completion
 * - Get Razorpay API key for frontend
 *
 * Flow:
 * 1. User creates an order (orderController.createOrder)
 * 2. Frontend calls POST /api/v1/payments/create → gets Razorpay order ID
 * 3. Frontend opens Razorpay checkout with the order ID
 * 4. After payment, frontend calls POST /api/v1/payments/verify → payment verified
 * 5. Order is marked as paid
 */

const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
} = require('../services/paymentService');

/**
 * @desc    Get Razorpay API Key (for frontend checkout)
 * @route   GET /api/v1/payments/key
 * @access  Private
 */
const getRazorpayKey = catchAsync(async (req, res, next) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return next(new ApiError('Razorpay is not configured on this server.', 503));
  }

  res.status(200).json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

/**
 * @desc    Create Razorpay order for an existing order
 * @route   POST /api/v1/payments/create
 * @access  Private
 *
 * Body: { orderId: "..." }
 *
 * Prerequisites:
 * - Order must exist and belong to the authenticated user
 * - Order payment status must be 'pending'
 * - Order payment method must be 'razorpay'
 */
const createPaymentOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId) {
    return next(new ApiError('Please provide an order ID.', 400));
  }

  // Find the order
  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${orderId}`, 404));
  }

  // Ensure user owns this order
  if (order.user.toString() !== req.user.id) {
    return next(new ApiError('You are not authorized to pay for this order.', 403));
  }

  // Check if already paid
  if (order.paymentInfo.status === 'paid') {
    return next(new ApiError('This order has already been paid.', 400));
  }

  // Check payment method
  if (order.paymentInfo.method !== 'razorpay') {
    return next(new ApiError('This order does not use Razorpay payment.', 400));
  }

  // Create Razorpay order
  const razorpayOrder = await createRazorpayOrder(
    order.totalPrice,
    order._id.toString(),
    {
      userId: req.user.id,
      userEmail: req.user.email,
    }
  );

  // Store Razorpay order ID in the order
  order.paymentInfo.razorpayOrderId = razorpayOrder.id;
  await order.save({ validateBeforeSave: false });

  logger.info(`Razorpay payment initiated for order ${order._id} by ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Razorpay order created',
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    },
    order: {
      _id: order._id,
      totalPrice: order.totalPrice,
    },
    key: process.env.RAZORPAY_KEY_ID,
  });
});

/**
 * @desc    Verify Razorpay payment signature and mark order as paid
 * @route   POST /api/v1/payments/verify
 * @access  Private
 *
 * Body: {
 *   orderId: "...",
 *   razorpay_order_id: "...",
 *   razorpay_payment_id: "...",
 *   razorpay_signature: "..."
 * }
 */
const verifyPayment = catchAsync(async (req, res, next) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Validate required fields
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new ApiError('Missing required payment verification fields.', 400));
  }

  // Find the order
  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${orderId}`, 404));
  }

  // Ensure user owns this order
  if (order.user.toString() !== req.user.id) {
    return next(new ApiError('You are not authorized to verify this payment.', 403));
  }

  // Verify that the Razorpay order ID matches
  if (order.paymentInfo.razorpayOrderId !== razorpay_order_id) {
    return next(new ApiError('Razorpay order ID mismatch.', 400));
  }

  // Verify signature using HMAC SHA256
  const isSignatureValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isSignatureValid) {
    // Mark payment as failed
    order.paymentInfo.status = 'failed';
    await order.save({ validateBeforeSave: false });

    logger.warn(`Payment verification FAILED for order ${order._id}`);
    return next(new ApiError('Payment verification failed. Invalid signature.', 400));
  }

  // Payment verified — update order
  order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
  order.paymentInfo.razorpaySignature = razorpay_signature;
  order.paymentInfo.status = 'paid';
  order.paymentInfo.paidAt = Date.now();
  order.orderStatus = 'processing'; // Move from pending to processing

  await order.save({ validateBeforeSave: false });

  logger.info(`Payment verified and order ${order._id} marked as paid. Payment ID: ${razorpay_payment_id}`);

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    order: {
      _id: order._id,
      orderStatus: order.orderStatus,
      paymentInfo: {
        status: order.paymentInfo.status,
        razorpayPaymentId: order.paymentInfo.razorpayPaymentId,
        paidAt: order.paymentInfo.paidAt,
      },
    },
  });
});

/**
 * @desc    Get payment details for an order
 * @route   GET /api/v1/payments/:orderId
 * @access  Private
 */
const getPaymentStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${req.params.orderId}`, 404));
  }

  // Ensure user owns this order or is admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ApiError('You are not authorized to view this payment.', 403));
  }

  // If there's a Razorpay payment ID, fetch live details
  let razorpayDetails = null;
  if (order.paymentInfo.razorpayPaymentId) {
    try {
      razorpayDetails = await fetchPaymentDetails(order.paymentInfo.razorpayPaymentId);
    } catch (error) {
      logger.warn(`Could not fetch Razorpay details for payment ${order.paymentInfo.razorpayPaymentId}`);
    }
  }

  res.status(200).json({
    success: true,
    paymentInfo: order.paymentInfo,
    razorpayDetails,
  });
});

module.exports = {
  getRazorpayKey,
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
};
