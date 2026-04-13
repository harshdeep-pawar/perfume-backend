/**
 * Review Validators
 * -----------------
 * Input validation rules for product reviews.
 * Uses express-validator for server-side validation.
 */

const { body } = require('express-validator');

/**
 * Validation rules for creating/updating a review
 */
const reviewValidation = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Review must be between 5 and 500 characters'),

  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
];

module.exports = { reviewValidation };
