/**
 * Custom API Error Class
 * ----------------------
 * Extends the built-in Error class to include HTTP status codes.
 * Used throughout the application for consistent error handling.
 */

class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Capture stack trace, excluding constructor call from the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
