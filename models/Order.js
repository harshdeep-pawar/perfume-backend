/**
 * Order Model
 * -----------
 * Defines the Order schema for tracking purchases.
 *
 * Features:
 * - Shipping address information
 * - Multiple ordered items with product references
 * - Payment tracking (simulated)
 * - Order status workflow (processing → shipped → delivered)
 * - Price breakdown (items, tax, shipping, total)
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  image: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: {
        type: String,
        required: [true, 'Please provide shipping address'],
      },
      city: {
        type: String,
        required: [true, 'Please provide city'],
      },
      state: {
        type: String,
        required: [true, 'Please provide state'],
      },
      country: {
        type: String,
        required: [true, 'Please provide country'],
        default: 'India',
      },
      pinCode: {
        type: String,
        required: [true, 'Please provide pin code'],
      },
      phone: {
        type: String,
        required: [true, 'Please provide phone number'],
      },
    },
    paymentInfo: {
      id: {
        type: String,
        default: 'SIMULATED',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      method: {
        type: String,
        enum: ['card', 'upi', 'cod', 'netbanking'],
        default: 'cod',
      },
      paidAt: {
        type: Date,
      },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Invalid order status',
      },
      default: 'processing',
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
