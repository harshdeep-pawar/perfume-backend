/**
 * Authentication Routes
 * ---------------------
 * Public: register, login
 * Private: profile, logout, update profile/password
 * Admin: user management
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
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
} = require('../controllers/authController');

// Middleware
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');

// Validators
const { registerValidation, loginValidation } = require('../validations/authValidation');
const validate = require('../validations/validate');

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', registerValidation, validate, register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginValidation, validate, login);

// ==========================================
// PROTECTED ROUTES (Authenticated Users)
// ==========================================

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', isAuthenticated, getProfile);

/**
 * @swagger
 * /api/v1/auth/me/update:
 *   put:
 *     summary: Update user profile (name, email)
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/me/update', isAuthenticated, updateProfile);

/**
 * @swagger
 * /api/v1/auth/me/password:
 *   put:
 *     summary: Update password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/me/password', isAuthenticated, updatePassword);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', isAuthenticated, logout);

/**
 * @swagger
 * /api/v1/auth/promote-admin:
 *   post:
 *     summary: Promote current user to admin (requires setup key)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [setupKey]
 *             properties:
 *               setupKey:
 *                 type: string
 *                 description: Server-side ADMIN_SETUP_KEY from .env
 *     responses:
 *       200:
 *         description: User promoted to admin
 *       403:
 *         description: Invalid setup key
 */
router.post('/promote-admin', isAuthenticated, promoteToAdmin);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @swagger
 * /api/v1/auth/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin - Users]
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Not authorized
 */
router.get('/admin/users', isAuthenticated, authorizeRoles('admin'), getAllUsers);

/**
 * @swagger
 * /api/v1/auth/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router
  .route('/admin/users/:id')
  .all(isAuthenticated, authorizeRoles('admin'))
  .get(getUserById)
  .put(updateUserRole)
  .delete(deleteUser);

module.exports = router;
