/**
 * Order Service
 * -------------
 * Business logic for order-related operations.
 * Handles stock management and price calculations.
 */

const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * Calculate order prices (items, tax, shipping, total)
 * @param {Array} orderItems - Array of order items
 * @returns {Object} { itemsPrice, taxPrice, shippingPrice, totalPrice }
 */
const calculateOrderPrices = (orderItems) => {
  // Calculate items total
  const itemsPrice = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Tax rate: 18% GST (Indian standard)
  const taxRate = 0.18;
  const taxPrice = Math.round(itemsPrice * taxRate * 100) / 100;

  // Free shipping for orders above ₹999, otherwise ₹99
  const shippingPrice = itemsPrice > 999 ? 0 : 99;

  // Total
  const totalPrice = Math.round((itemsPrice + taxPrice + shippingPrice) * 100) / 100;

  return {
    itemsPrice: Math.round(itemsPrice * 100) / 100,
    taxPrice,
    shippingPrice,
    totalPrice,
  };
};

/**
 * Update product stock after order is placed
 * Decreases stock for each ordered item
 * @param {Array} orderItems - Array of { product, quantity }
 */
const updateStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (product) {
      product.stock -= item.quantity;

      // Ensure stock doesn't go below 0
      if (product.stock < 0) {
        product.stock = 0;
      }

      await product.save({ validateBeforeSave: false });
      logger.info(`Stock updated for product ${product.name}: ${product.stock} remaining`);
    }
  }
};

/**
 * Restore product stock (for cancelled orders)
 * @param {Array} orderItems - Array of { product, quantity }
 */
const restoreStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (product) {
      product.stock += item.quantity;
      await product.save({ validateBeforeSave: false });
      logger.info(`Stock restored for product ${product.name}: ${product.stock} now available`);
    }
  }
};

module.exports = { calculateOrderPrices, updateStock, restoreStock };
