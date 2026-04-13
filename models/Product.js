/**
 * Product Model
 * -------------
 * Defines the Product (Perfume) schema with embedded reviews.
 *
 * Features:
 * - Multiple image support (Cloudinary URLs)
 * - Embedded reviews subdocument
 * - Auto-calculated average rating
 * - Category-based classification
 * - Stock tracking
 * - Virtual population of review count
 */

const mongoose = require('mongoose');

// Review sub-schema (embedded in Product)
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide a review comment'],
      maxlength: [500, 'Review cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Product schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the product name'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    brand: {
      type: String,
      required: [true, 'Please provide the brand name'],
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide the product price'],
      min: [0, 'Price cannot be negative'],
      maxlength: [8, 'Price cannot exceed 8 digits'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: {
        values: [
          'eau-de-parfum',
          'eau-de-toilette',
          'eau-de-cologne',
          'perfume-extract',
          'body-mist',
          'attar',
          'unisex',
          'men',
          'women',
        ],
        message: 'Please select a valid category',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search and filtering performance
productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ ratings: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
