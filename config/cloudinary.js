/**
 * Cloudinary Configuration
 * ------------------------
 * Configures Cloudinary SDK for image upload/management.
 * Images are stored in Cloudinary's cloud storage.
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  logger.info('Cloudinary configured successfully');
};

module.exports = { cloudinary, connectCloudinary };
