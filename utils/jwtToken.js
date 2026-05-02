const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token containing the user's database ID.
 *
 * @param {string} id - The user's MongoDB _id
 * @returns {string} Signed JWT token
 */
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Send JWT token response with HTTP-only cookie.
 * Strips sensitive fields and returns a clean user payload.
 *
 * @param {Object}   user       - Mongoose user document
 * @param {number}   statusCode - HTTP status code
 * @param {Object}   res        - Express response object
 * @param {string}   message    - Success message
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Exclude password from the API response payload cleanly
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: userData,
    });
};

module.exports = { generateToken, sendTokenResponse };
