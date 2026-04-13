/**
 * Cloudinary Upload Service
 * -------------------------
 * Handles all image upload/deletion operations with Cloudinary.
 * Used by controllers to abstract cloud storage logic.
 *
 * Features:
 * - Upload from buffer (memory storage)
 * - Upload from file path
 * - Delete single/multiple images
 * - Auto-optimization (quality, format)
 */

const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * Upload a single image buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from Multer memory storage
 * @param {string} folder - Cloudinary folder name
 * @returns {Object} { public_id, url }
 */
const uploadToCloudinary = (fileBuffer, folder = 'perfume-ecommerce') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' }, // Resize to max 800x800
          { quality: 'auto:good' }, // Auto quality optimization
          { fetch_format: 'auto' }, // Auto format (WebP, AVIF, etc.)
        ],
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          reject(error);
        } else {
          resolve({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload multiple image buffers to Cloudinary
 * @param {Array} files - Array of Multer file objects
 * @param {string} folder - Cloudinary folder name
 * @returns {Array} Array of { public_id, url }
 */
const uploadMultipleToCloudinary = async (files, folder = 'perfume-ecommerce') => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, folder));
  return await Promise.all(uploadPromises);
};

/**
 * Delete a single image from Cloudinary
 * @param {string} publicId - Cloudinary public_id of the image
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary delete: ${publicId} - ${result.result}`);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array} publicIds - Array of Cloudinary public_ids
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
  const deletePromises = publicIds.map((id) => deleteFromCloudinary(id));
  return await Promise.all(deletePromises);
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
};
