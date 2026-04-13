/**
 * Product Controller
 * ------------------
 * Handles all product (perfume) CRUD operations.
 * Admin-only: create, update, delete
 * Public: get all, get single, search, filter
 *
 * Endpoints:
 * GET    /api/v1/products          - Get all products (search, filter, sort, paginate)
 * GET    /api/v1/products/:id      - Get single product
 * POST   /api/v1/products          - Create product (Admin)
 * PUT    /api/v1/products/:id      - Update product (Admin)
 * DELETE /api/v1/products/:id      - Delete product (Admin)
 */

const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const ApiFeatures = require('../utils/apiFeatures');
const { uploadMultipleToCloudinary, deleteMultipleFromCloudinary } = require('../services/cloudinaryService');
const logger = require('../utils/logger');

/**
 * @desc    Get all products with search, filter, sort, pagination
 * @route   GET /api/v1/products
 * @access  Public
 *
 * Query Parameters:
 * - keyword: Search by product name (regex)
 * - category: Filter by category
 * - brand: Filter by brand
 * - price[gte]: Min price
 * - price[lte]: Max price
 * - sort: Sort field(s) e.g., "price" or "-price,ratings"
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 10)
 */
const getAllProducts = catchAsync(async (req, res, next) => {
  // Count total documents for pagination metadata
  const totalProducts = await Product.countDocuments();

  // Build query with ApiFeatures
  const apiFeatures = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .sort()
    .paginate();

  const products = await apiFeatures.query;

  // Calculate pagination details
  const totalPages = Math.ceil(totalProducts / (apiFeatures.limit || 10));

  res.status(200).json({
    success: true,
    count: products.length,
    totalProducts,
    totalPages,
    currentPage: apiFeatures.page || 1,
    products,
  });
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/v1/products/:id
 * @access  Public
 */
const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('reviews.user', 'name email');

  if (!product) {
    return next(new ApiError(`Product not found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    product,
  });
});

/**
 * @desc    Create a new product
 * @route   POST /api/v1/products
 * @access  Private/Admin
 *
 * Accepts multipart/form-data with:
 * - Text fields: name, brand, price, description, category, stock
 * - File fields: images (up to 5 files)
 */
const createProduct = catchAsync(async (req, res, next) => {
  // Attach the admin user who created the product
  req.body.user = req.user.id;

  // Handle image uploads to Cloudinary
  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleToCloudinary(req.files, 'perfume-ecommerce/products');
    logger.info(`Uploaded ${images.length} images for new product`);
  }

  // Create product with image data
  const product = await Product.create({
    ...req.body,
    images,
  });

  logger.info(`New product created: ${product.name} by admin ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product,
  });
});

/**
 * @desc    Update an existing product
 * @route   PUT /api/v1/products/:id
 * @access  Private/Admin
 *
 * Handles partial updates and optional new image uploads.
 * If new images are uploaded, old images are deleted from Cloudinary.
 */
const updateProduct = catchAsync(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ApiError(`Product not found with ID: ${req.params.id}`, 404));
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    // Delete old images from Cloudinary
    if (product.images && product.images.length > 0) {
      const oldPublicIds = product.images.map((img) => img.public_id);
      await deleteMultipleFromCloudinary(oldPublicIds);
      logger.info(`Deleted ${oldPublicIds.length} old images for product: ${product.name}`);
    }

    // Upload new images
    const newImages = await uploadMultipleToCloudinary(req.files, 'perfume-ecommerce/products');
    req.body.images = newImages;
    logger.info(`Uploaded ${newImages.length} new images for product: ${product.name}`);
  }

  // Update the product
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  logger.info(`Product updated: ${product.name} by admin ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product,
  });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/v1/products/:id
 * @access  Private/Admin
 *
 * Also deletes associated images from Cloudinary.
 */
const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ApiError(`Product not found with ID: ${req.params.id}`, 404));
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    const publicIds = product.images.map((img) => img.public_id);
    await deleteMultipleFromCloudinary(publicIds);
    logger.info(`Deleted ${publicIds.length} images for product: ${product.name}`);
  }

  // Delete the product
  await Product.findByIdAndDelete(req.params.id);

  logger.info(`Product deleted: ${product.name} by admin ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
