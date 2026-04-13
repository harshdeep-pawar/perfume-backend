/**
 * Cart Model
 * ----------
 * Defines the Cart schema for user shopping carts.
 *
 * Features:
 * - One cart per user (unique userId)
 * - Multiple cart items with product reference
 * - Quantity tracking per item
 * - Auto-calculated total price
 * - Pre-save hook for total calculation
 */

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One cart per user
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: Calculate total price and total items
 */
cartSchema.pre('save', function (next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalPrice = this.items.reduce((total, item) => total + item.price * item.quantity, 0);
  // Round to 2 decimal places
  this.totalPrice = Math.round(this.totalPrice * 100) / 100;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
