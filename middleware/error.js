/**
 * Global Error Handling Middleware
 * --------------------------------
 * Catches all errors thrown in the application and sends
 * a consistent JSON error response.
 *
 * Handles specific error types:
 * - CastError (invalid MongoDB ObjectId)
 * - ValidationError (Mongoose validation)
 * - Duplicate key errors (MongoDB code 11000)
 * - JWT errors (invalid/expired tokens)
 * - Multer errors (file upload limits)
 * - Razorpay errors (payment gateway)
 */

const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`);

  // Development: send full error with stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production: send clean error messages
  let error = { ...err };
  error.message = err.message;

  // Mongoose: Invalid ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    error = new ApiError(message, 400);
  }

  // Mongoose: Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error = new ApiError(message, 400);
  }

  // MongoDB: Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    error = new ApiError(message, 400);
  }

  // JWT: Invalid Token
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new ApiError(message, 401);
  }

  // JWT: Expired Token
  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired. Please log in again.';
    error = new ApiError(message, 401);
  }

  // Multer: File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Maximum size is 5MB.';
    error = new ApiError(message, 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files. Maximum 5 files allowed.';
    error = new ApiError(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field.';
    error = new ApiError(message, 400);
  }

  // Razorpay: Payment gateway errors
  if (err.error && err.error.source === 'gateway') {
    const message = 'Payment gateway error. Please try again.';
    error = new ApiError(message, 502);
  }

  // Razorpay: Bad request errors
  if (err.statusCode === 400 && err.error && err.error.description) {
    error = new ApiError(err.error.description, 400);
  }

  // Syntax Error (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new ApiError('Invalid JSON in request body.', 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
};

module.exports = errorMiddleware;
