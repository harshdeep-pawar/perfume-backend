/**
 * Review Controller
 * -----------------
 * Handles product reviews and ratings.
 * Reviews are embedded within the Product document.
 *
 * Endpoints:
 * POST   /api/v1/reviews         - Add/Update review
 * GET    /api/v1/reviews/:productId - Get all reviews for a product
 * DELETE /api/v1/reviews         - Delete review
 */

const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * @desc    Create or update a product review
 * @route   POST /api/v1/reviews
 * @access  Private
 *
 * Body: { productId: "...", rating: 4, comment: "Great perfume!" }
 *
 * If user has already reviewed the product, the review is updated.
 * Otherwise, a new review is added.
 */
const createOrUpdateReview = catchAsync(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  // Build review object
  const review = {
    user: req.user.id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  // Find the product
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ApiError('Product not found.', 404));
  }

  // Check if user already reviewed this product
  const existingReviewIndex = product.reviews.findIndex(
    (rev) => rev.user.toString() === req.user.id
  );

  if (existingReviewIndex >= 0) {
    // Update existing review
    product.reviews[existingReviewIndex].rating = review.rating;
    product.reviews[existingReviewIndex].comment = review.comment;

    logger.info(`Review updated by ${req.user.email} for product: ${product.name}`);
  } else {
    // Add new review
    product.reviews.push(review);

    logger.info(`New review added by ${req.user.email} for product: ${product.name}`);
  }

  // Recalculate average rating and review count
  product.numOfReviews = product.reviews.length;
  product.ratings =
    product.reviews.reduce((sum, rev) => sum + rev.rating, 0) / product.reviews.length;

  // Round to 1 decimal place
  product.ratings = Math.round(product.ratings * 10) / 10;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: existingReviewIndex >= 0 ? 'Review updated successfully' : 'Review added successfully',
    ratings: product.ratings,
    numOfReviews: product.numOfReviews,
  });
});

/**
 * @desc    Get all reviews for a product
 * @route   GET /api/v1/reviews/:productId
 * @access  Public
 */
const getProductReviews = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new ApiError('Product not found.', 404));
  }

  res.status(200).json({
    success: true,
    count: product.reviews.length,
    ratings: product.ratings,
    reviews: product.reviews,
  });
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/v1/reviews
 * @access  Private
 *
 * Query: ?productId=...&reviewId=...
 *
 * Users can only delete their own reviews.
 * Admins can delete any review.
 */
const deleteReview = catchAsync(async (req, res, next) => {
  const { productId, reviewId } = req.query;

  if (!productId || !reviewId) {
    return next(new ApiError('Please provide productId and reviewId.', 400));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ApiError('Product not found.', 404));
  }

  // Find the review
  const review = product.reviews.find((rev) => rev._id.toString() === reviewId);

  if (!review) {
    return next(new ApiError('Review not found.', 404));
  }

  // Authorization: only review owner or admin can delete
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ApiError('You are not authorized to delete this review.', 403));
  }

  // Remove the review
  product.reviews = product.reviews.filter((rev) => rev._id.toString() !== reviewId);

  // Recalculate average rating
  if (product.reviews.length > 0) {
    product.ratings =
      product.reviews.reduce((sum, rev) => sum + rev.rating, 0) / product.reviews.length;
    product.ratings = Math.round(product.ratings * 10) / 10;
  } else {
    product.ratings = 0;
  }
  product.numOfReviews = product.reviews.length;

  await product.save({ validateBeforeSave: false });

  logger.info(`Review deleted by ${req.user.email} for product: ${product.name}`);

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
    ratings: product.ratings,
    numOfReviews: product.numOfReviews,
  });
});

module.exports = {
  createOrUpdateReview,
  getProductReviews,
  deleteReview,
};
