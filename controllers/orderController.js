/**
 * Order Controller
 * ----------------
 * Handles order creation, retrieval, and status management.
 *
 * Endpoints:
 * POST   /api/v1/orders              - Create new order
 * GET    /api/v1/orders/me            - Get user's order history
 * GET    /api/v1/orders/:id           - Get single order
 * GET    /api/v1/orders/admin/all     - Get all orders (Admin)
 * PUT    /api/v1/orders/admin/:id     - Update order status (Admin)
 * DELETE /api/v1/orders/admin/:id     - Delete order (Admin)
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const { calculateOrderPrices, updateStock, restoreStock } = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * @desc    Create a new order
 * @route   POST /api/v1/orders
 * @access  Private
 *
 * Body: {
 *   orderItems: [{ product: "productId", quantity: 2 }],
 *   shippingAddress: { address, city, state, country, pinCode, phone },
 *   paymentInfo: { method: "cod" }
 * }
 */
const createOrder = catchAsync(async (req, res, next) => {
  const { orderItems, shippingAddress, paymentInfo } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new ApiError('No order items provided.', 400));
  }

  // Validate products and build order items with current prices
  const validatedItems = [];
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      return next(new ApiError(`Product not found: ${item.product}`, 404));
    }

    if (product.stock < item.quantity) {
      return next(
        new ApiError(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        )
      );
    }

    validatedItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images && product.images.length > 0 ? product.images[0].url : '',
    });
  }

  // Calculate prices
  const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calculateOrderPrices(validatedItems);

  // Simulate payment (mark as paid for non-COD methods)
  const payment = {
    id: paymentInfo?.method === 'cod' ? 'COD' : `SIM_${Date.now()}`,
    status: paymentInfo?.method === 'cod' ? 'pending' : 'paid',
    method: paymentInfo?.method || 'cod',
    paidAt: paymentInfo?.method !== 'cod' ? Date.now() : undefined,
  };

  // Create order
  const order = await Order.create({
    user: req.user.id,
    orderItems: validatedItems,
    shippingAddress,
    paymentInfo: payment,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  });

  // Update product stock
  await updateStock(validatedItems);

  // Clear user's cart after successful order
  await Cart.findOneAndDelete({ user: req.user.id });

  logger.info(`New order created: ${order._id} by user ${req.user.email} - Total: ₹${totalPrice}`);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    order,
  });
});

/**
 * @desc    Get logged-in user's order history
 * @route   GET /api/v1/orders/me
 * @access  Private
 */
const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id }).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

/**
 * @desc    Get single order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${req.params.id}`, 404));
  }

  // Ensure user can only view their own orders (unless admin)
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ApiError('You are not authorized to view this order.', 403));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/v1/orders/admin/all
 * @access  Private/Admin
 */
const getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .sort('-createdAt');

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  res.status(200).json({
    success: true,
    count: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    orders,
  });
});

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/v1/orders/admin/:id
 * @access  Private/Admin
 *
 * Body: { status: "shipped" | "delivered" | "cancelled" }
 */
const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${req.params.id}`, 404));
  }

  // Prevent updating already delivered orders
  if (order.orderStatus === 'delivered') {
    return next(new ApiError('This order has already been delivered.', 400));
  }

  // Prevent updating cancelled orders
  if (order.orderStatus === 'cancelled') {
    return next(new ApiError('This order has been cancelled and cannot be updated.', 400));
  }

  // Handle cancellation - restore stock
  if (status === 'cancelled') {
    await restoreStock(order.orderItems);
    logger.info(`Order cancelled and stock restored: ${order._id}`);
  }

  // Update status
  order.orderStatus = status;

  // Set delivered date
  if (status === 'delivered') {
    order.deliveredAt = Date.now();
    order.paymentInfo.status = 'paid';
    order.paymentInfo.paidAt = order.paymentInfo.paidAt || Date.now();
  }

  await order.save({ validateBeforeSave: false });

  logger.info(`Order status updated to "${status}": ${order._id} by admin ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: `Order status updated to "${status}"`,
    order,
  });
});

/**
 * @desc    Delete an order (Admin)
 * @route   DELETE /api/v1/orders/admin/:id
 * @access  Private/Admin
 */
const deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${req.params.id}`, 404));
  }

  await Order.findByIdAndDelete(req.params.id);

  logger.info(`Order deleted: ${order._id} by admin ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Order deleted successfully',
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
};
