/**
 * Razorpay Configuration
 * ----------------------
 * Initializes Razorpay SDK instance with API credentials.
 * Used by paymentService for creating orders and verifying payments.
 */

const Razorpay = require('razorpay');
const logger = require('../utils/logger');

let razorpayInstance;

/**
 * Initialize Razorpay instance
 * Called during server startup
 */
const initRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn('Razorpay credentials not configured. Payment features will be unavailable.');
    return;
  }

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  logger.info('Razorpay initialized successfully');
};

/**
 * Get Razorpay instance
 * @returns {Razorpay} Razorpay instance
 */
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    throw new Error('Razorpay not initialized. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return razorpayInstance;
};

module.exports = { initRazorpay, getRazorpayInstance };
