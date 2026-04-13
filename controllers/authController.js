const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Directly generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'defaultsecret123',
      { expiresIn: '7d' }
    );

    // Send token response
    res.status(201)
       .cookie('token', token, { 
         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
         httpOnly: true 
       })
       .json({
         success: true,
         token,
         user: {
           _id: user._id,
           name: user.name,
           email: user.email,
           role: user.role,
         },
       });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Login user via email/password
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Explicitly select password field to check
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Verify password match
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Directly generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'defaultsecret123',
      { expiresIn: '7d' }
    );

    // Send token response
    res.status(200)
       .cookie('token', token, { 
         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
         httpOnly: true 
       })
       .json({
         success: true,
         token,
         user: {
           _id: user._id,
           name: user.name,
           email: user.email,
           role: user.role,
         },
       });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Update user profile (name, email)
 * @route   PUT /api/v1/auth/me/update
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/me/password
 * @access  Private
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password.' });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    // Re-issue token using direct implementation
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'defaultsecret123',
      { expiresIn: '7d' }
    );

    res.status(200)
       .cookie('token', token, { 
         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
         httpOnly: true 
       })
       .json({
         success: true,
         token,
         user: {
           _id: user._id,
           name: user.name,
           email: user.email,
           role: user.role,
         },
       });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Logout user (clear cookie)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/v1/auth/admin/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Get single user by ID (Admin)
 * @route   GET /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: `User not found with ID: ${req.params.id}` });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Update user role (Admin)
 * @route   PUT /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid role (user or admin).' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: `User not found with ID: ${req.params.id}` });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Delete user (Admin)
 * @route   DELETE /api/v1/auth/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: `User not found with ID: ${req.params.id}` });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Export ALL defined functions to avoid "undefined" router errors
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
};
