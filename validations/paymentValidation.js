/**
 * Payment Validators
 * ------------------
 * Input validation rules for payment endpoints.
 * Uses express-validator for server-side validation.
 */

const { body } = require('express-validator');

/**
 * Validation rules for creating a Razorpay payment order
 */
const createPaymentValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

/**
 * Validation rules for verifying Razorpay payment
 */
const verifyPaymentValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required')
    .isString()
    .withMessage('Razorpay order ID must be a string'),

  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required')
    .isString()
    .withMessage('Razorpay payment ID must be a string'),

  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required')
    .isString()
    .withMessage('Razorpay signature must be a string'),
];

module.exports = { createPaymentValidation, verifyPaymentValidation };
