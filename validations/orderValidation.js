/**
 * Order Validators
 * ----------------
 * Input validation rules for order creation and status updates.
 * Uses express-validator for server-side validation.
 */

const { body } = require('express-validator');

/**
 * Shared shipping address validation rules
 */
const shippingAddressValidation = [
  body('shippingAddress.address')
    .trim()
    .notEmpty()
    .withMessage('Shipping address is required'),

  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('shippingAddress.country')
    .optional()
    .trim(),

  body('shippingAddress.pinCode')
    .trim()
    .notEmpty()
    .withMessage('Pin code is required')
    .isLength({ min: 5, max: 10 })
    .withMessage('Pin code must be between 5 and 10 characters'),

  body('shippingAddress.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
];

/**
 * Validation rules for creating an order (from body items)
 */
const createOrderValidation = [
  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('orderItems.*.product')
    .notEmpty()
    .withMessage('Product ID is required for each order item')
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('orderItems.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  ...shippingAddressValidation,

  body('paymentInfo.method')
    .optional()
    .isIn(['razorpay', 'cod'])
    .withMessage('Invalid payment method. Use "razorpay" or "cod"'),
];

/**
 * Validation rules for creating an order from cart
 * (no orderItems needed — they come from the cart)
 */
const createOrderFromCartValidation = [
  ...shippingAddressValidation,

  body('paymentInfo.method')
    .optional()
    .isIn(['razorpay', 'cod'])
    .withMessage('Invalid payment method. Use "razorpay" or "cod"'),
];

/**
 * Validation rules for updating order status (Admin)
 */
const updateOrderStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Order status is required')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
];

module.exports = {
  createOrderValidation,
  createOrderFromCartValidation,
  updateOrderStatusValidation,
};
