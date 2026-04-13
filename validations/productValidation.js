/**
 * Product Validators
 * ------------------
 * Input validation rules for product creation and updates.
 * Uses express-validator for server-side validation.
 */

const { body } = require('express-validator');

/**
 * Validation rules for creating a product
 */
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),

  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 50 })
    .withMessage('Brand name cannot exceed 50 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn([
      'eau-de-parfum',
      'eau-de-toilette',
      'eau-de-cologne',
      'perfume-extract',
      'body-mist',
      'attar',
      'unisex',
      'men',
      'women',
    ])
    .withMessage('Please select a valid category'),

  body('stock')
    .notEmpty()
    .withMessage('Stock is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
];

/**
 * Validation rules for updating a product
 * All fields are optional during updates
 */
const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand name cannot exceed 50 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('category')
    .optional()
    .isIn([
      'eau-de-parfum',
      'eau-de-toilette',
      'eau-de-cologne',
      'perfume-extract',
      'body-mist',
      'attar',
      'unisex',
      'men',
      'women',
    ])
    .withMessage('Please select a valid category'),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
];

module.exports = { createProductValidation, updateProductValidation };
