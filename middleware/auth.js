/**
 * Authentication & Authorization Middleware
 * ------------------------------------------
 * - isAuthenticated: Verifies JWT token and attaches user to request
 * - authorizeRoles: Restricts access based on user roles
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware: Verify JWT token
 * Extracts token from Authorization header or cookies.
 * Attaches the authenticated user to req.user.
 */
const isAuthenticated = catchAsync(async (req, res, next) => {
  let token;

  // Check Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Fallback: Check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // No token found
  if (!token) {
    return next(new ApiError('Access denied. Please log in to continue.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Find user and attach to request
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError('User no longer exists.', 401));
  }

  req.user = user;
  next();
});

/**
 * Middleware: Role-based access control
 * Restricts route access to specified roles.
 *
 * Usage: authorizeRoles('admin') or authorizeRoles('admin', 'moderator')
 *
 * @param  {...string} roles - Allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(`Role '${req.user.role}' is not authorized to access this resource.`, 403)
      );
    }
    next();
  };
};

module.exports = { isAuthenticated, authorizeRoles };
