/**
 * Auth Controller
 * ---------------
 * Handles user authentication, profile management, and admin user operations.
 *
 * Public:  register, login
 * Private: getProfile, updateProfile, updatePassword, logout
 * Admin:   getAllUsers, getUserById, updateUserRole, deleteUser
 */

const User = require('../models/User');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const { sendTokenResponse } = require('../utils/jwtToken');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate inputs
  if (!name || !email || !password) {
    return next(new ApiError('Please provide name, email, and password.', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new ApiError('An account with this email already exists.', 400));
  }

  // Create user (password is hashed automatically via pre-save hook)
  const user = await User.create({ name, email, password });

  logger.info(`New user registered: ${user.email}`);

  sendTokenResponse(user, 201, res, 'Registration successful');
});

/**
 * @desc    Login user via email/password
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError('Please provide both email and password.', 400));
  }

  // Explicitly select password field to check
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return next(new ApiError('Invalid email or password.', 401));
  }

  // Verify password match
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ApiError('Invalid email or password.', 401));
  }

  logger.info(`User logged in: ${user.email}`);

  sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new ApiError('User not found.', 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Update user profile (name, email)
 * @route   PUT /api/v1/auth/me/update
 * @access  Private
 */
const updateProfile = catchAsync(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  if (Object.keys(fieldsToUpdate).length === 0) {
    return next(new ApiError('Please provide at least one field to update.', 400));
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  logger.info(`Profile updated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/me/password
 * @access  Private
 */
const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ApiError('Please provide current and new password.', 400));
  }

  if (newPassword.length < 6) {
    return next(new ApiError('New password must be at least 6 characters.', 400));
  }

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ApiError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  logger.info(`Password updated: ${user.email}`);

  // Re-issue token
  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

/**
 * @desc    Logout user (clear cookie)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/v1/auth/admin/users
 * @access  Private/Admin
 */
const getAllUsers = catchAsync(async (req, res, next) => {
  // Support pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const totalUsers = await User.countDocuments();
  const users = await User.find()
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: users.length,
    totalUsers,
    totalPages: Math.ceil(totalUsers / limit),
    currentPage: page,
    users,
  });
});

/**
 * @desc    Get single user by ID (Admin)
 * @route   GET /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ApiError(`User not found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Update user role (Admin)
 * @route   PUT /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    return next(new ApiError('Please provide a valid role (user or admin).', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ApiError(`User not found with ID: ${req.params.id}`, 404));
  }

  logger.info(`User role updated to "${role}": ${user.email}`);

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    user,
  });
});

/**
 * @desc    Delete user (Admin)
 * @route   DELETE /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ApiError(`User not found with ID: ${req.params.id}`, 404));
  }

  await User.findByIdAndDelete(req.params.id);

  logger.info(`User deleted: ${user.email} by admin ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Promote current user to admin (one-time bootstrap)
 * @route   POST /api/v1/auth/promote-admin
 * @access  Private (requires ADMIN_SETUP_KEY)
 *
 * This route exists to solve the chicken-and-egg problem:
 * You need an admin to create an admin, but no admin exists initially.
 * Secured via a server-side secret key from .env — remove after first use.
 */
const promoteToAdmin = catchAsync(async (req, res, next) => {
  const { setupKey } = req.body;

  // Validate setup key
  if (!process.env.ADMIN_SETUP_KEY) {
    return next(new ApiError('Admin setup is disabled. No ADMIN_SETUP_KEY configured.', 403));
  }

  if (!setupKey || setupKey !== process.env.ADMIN_SETUP_KEY) {
    return next(new ApiError('Invalid setup key. Access denied.', 403));
  }

  // Promote the authenticated user to admin
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { role: 'admin' },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ApiError('User not found.', 404));
  }

  logger.info(`User promoted to admin: ${user.email} (via setup key)`);

  // Re-issue token with updated role
  sendTokenResponse(user, 200, res, `User '${user.email}' promoted to admin successfully`);
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword,
  logout,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  promoteToAdmin,
};
