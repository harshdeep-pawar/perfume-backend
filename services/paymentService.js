/**
 * Payment Service
 * ---------------
 * Handles all Razorpay payment operations.
 * Abstracts payment gateway logic from controllers.
 *
 * Features:
 * - Create Razorpay order
 * - Verify payment signature (HMAC SHA256)
 * - Refund payment (placeholder for future use)
 */

const crypto = require('crypto');
const { getRazorpayInstance } = require('../config/razorpay');
const logger = require('../utils/logger');

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paisa)
 * @param {string} receipt - Unique receipt ID (usually order ID)
 * @param {Object} notes - Additional notes for the order
 * @returns {Object} Razorpay order object
 */
const createRazorpayOrder = async (amount, receipt, notes = {}) => {
  const razorpay = getRazorpayInstance();

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paisa
    currency: 'INR',
    receipt,
    notes,
  };

  const razorpayOrder = await razorpay.orders.create(options);

  logger.info(`Razorpay order created: ${razorpayOrder.id} for ₹${amount}`);

  return razorpayOrder;
};

/**
 * Verify Razorpay payment signature
 * Uses HMAC SHA256 to verify the payment authenticity
 *
 * @param {string} razorpayOrderId - Razorpay order ID
 * @param {string} razorpayPaymentId - Razorpay payment ID
 * @param {string} razorpaySignature - Razorpay signature from client
 * @returns {boolean} Whether the signature is valid
 */
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpaySignature;

  if (isValid) {
    logger.info(`Payment signature verified for order: ${razorpayOrderId}`);
  } else {
    logger.warn(`Payment signature verification FAILED for order: ${razorpayOrderId}`);
  }

  return isValid;
};

/**
 * Fetch Razorpay payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Object} Payment details from Razorpay
 */
const fetchPaymentDetails = async (paymentId) => {
  const razorpay = getRazorpayInstance();
  return await razorpay.payments.fetch(paymentId);
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
};
