/**
 * Multer File Upload Middleware
 * -----------------------------
 * Configures Multer for handling multipart/form-data (file uploads).
 * Files are stored temporarily in memory before being uploaded to Cloudinary.
 *
 * Supports: JPEG, JPG, PNG, WebP images
 * Max file size: 5MB
 */

const multer = require('multer');
const ApiError = require('../utils/apiError');

// Use memory storage (files stored in buffer, not disk)
// This is optimal for Cloudinary uploads since we pipe directly from memory
const storage = multer.memoryStorage();

// File filter - only allow image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Only JPEG, JPG, PNG, and WebP images are allowed.', 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5, // Max 5 files per upload
  },
});

module.exports = upload;
