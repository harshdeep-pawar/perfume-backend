/**
 * Order Controller
 * ----------------
 * Handles order creation, retrieval, and status management.
 *
 * Endpoints:
 * POST   /api/v1/orders              - Create order (from body items)
 * POST   /api/v1/orders/from-cart     - Create order from user's cart
 * GET    /api/v1/orders/me            - Get user's order history
 * GET    /api/v1/orders/:id           - Get single order
 * GET    /api/v1/orders/admin/all     - Get all orders (Admin)
 * PUT    /api/v1/orders/admin/:id     - Update order status (Admin)
 * DELETE /api/v1/orders/admin/:id     - Delete order (Admin)
 *
 * Order Status Flow:
 * pending → processing → shipped → delivered
 *                    ↘ cancelled
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const { calculateOrderPrices, updateStock, restoreStock } = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * Valid order status transitions
 * Prevents invalid state changes (e.g., shipped → pending)
 */
const VALID_STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * @desc    Create a new order from request body
 * @route   POST /api/v1/orders
 * @access  Private
 *
 * Body: {
 *   orderItems: [{ product: "productId", quantity: 2 }],
 *   shippingAddress: { address, city, state, country, pinCode, phone },
 *   paymentInfo: { method: "cod" | "razorpay" }
 * }
 */
const createOrder = catchAsync(async (req, res, next) => {
  const { orderItems, shippingAddress, paymentInfo } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new ApiError('No order items provided.', 400));
  }

  // Validate products and build order items with current prices (snapshot)
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

  // Determine payment method and initial status
  const method = paymentInfo?.method || 'cod';
  const isCOD = method === 'cod';

  // Create order
  const order = await Order.create({
    user: req.user.id,
    orderItems: validatedItems,
    shippingAddress,
    paymentInfo: {
      status: isCOD ? 'pending' : 'pending',
      method,
    },
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    orderStatus: isCOD ? 'processing' : 'pending', // COD orders go directly to processing
  });

  // Update product stock
  await updateStock(validatedItems);

  // Clear user's cart after successful order
  await Cart.findOneAndDelete({ user: req.user.id });

  logger.info(`New order created: ${order._id} by user ${req.user.email} - Total: ₹${totalPrice} [${method}]`);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    order,
  });
});

/**
 * @desc    Create order directly from user's cart
 * @route   POST /api/v1/orders/from-cart
 * @access  Private
 *
 * Body: {
 *   shippingAddress: { address, city, state, country, pinCode, phone },
 *   paymentInfo: { method: "cod" | "razorpay" }
 * }
 *
 * Automatically reads all items from the user's cart,
 * validates stock, creates order, deducts stock, and clears cart.
 */
const createOrderFromCart = catchAsync(async (req, res, next) => {
  const { shippingAddress, paymentInfo } = req.body;

  if (!shippingAddress) {
    return next(new ApiError('Please provide a shipping address.', 400));
  }

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price stock images');

  if (!cart || cart.items.length === 0) {
    return next(new ApiError('Your cart is empty. Add items before placing an order.', 400));
  }

  // Validate stock and build order items snapshot
  const validatedItems = [];
  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product);

    if (!product) {
      return next(new ApiError(`Product "${cartItem.name}" is no longer available.`, 404));
    }

    if (product.stock < cartItem.quantity) {
      return next(
        new ApiError(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, In cart: ${cartItem.quantity}`,
          400
        )
      );
    }

    validatedItems.push({
      product: product._id,
      name: product.name,
      price: product.price, // Use current price, not cart price (prevents stale pricing)
      quantity: cartItem.quantity,
      image: product.images && product.images.length > 0 ? product.images[0].url : '',
    });
  }

  // Calculate prices
  const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calculateOrderPrices(validatedItems);

  // Determine payment method
  const method = paymentInfo?.method || 'cod';
  const isCOD = method === 'cod';

  // Create order
  const order = await Order.create({
    user: req.user.id,
    orderItems: validatedItems,
    shippingAddress,
    paymentInfo: {
      status: 'pending',
      method,
    },
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    orderStatus: isCOD ? 'processing' : 'pending',
  });

  // Update product stock
  await updateStock(validatedItems);

  // Clear cart
  await Cart.findByIdAndDelete(cart._id);

  logger.info(`Order from cart: ${order._id} by ${req.user.email} - ${validatedItems.length} items - ₹${totalPrice} [${method}]`);

  res.status(201).json({
    success: true,
    message: 'Order placed from cart successfully',
    order,
  });
});

/**
 * @desc    Get logged-in user's order history
 * @route   GET /api/v1/orders/me
 * @access  Private
 */
const getMyOrders = catchAsync(async (req, res, next) => {
  // Support pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments({ user: req.user.id });
  const orders = await Order.find({ user: req.user.id })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: orders.length,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
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
  // Support pagination and filtering
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Optional status filter
  const filter = {};
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  }

  const totalOrders = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  // Calculate total revenue
  const revenueAgg = await Order.aggregate([
    { $match: { 'paymentInfo.status': 'paid' } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ]);
  const totalRevenue = revenueAgg.length > 0 ? Math.round(revenueAgg[0].totalRevenue * 100) / 100 : 0;

  res.status(200).json({
    success: true,
    count: orders.length,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
    totalRevenue,
    orders,
  });
});

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/v1/orders/admin/:id
 * @access  Private/Admin
 *
 * Body: { status: "processing" | "shipped" | "delivered" | "cancelled" }
 *
 * Enforces valid status transitions:
 * pending → processing → shipped → delivered
 *                    ↘ cancelled
 */
const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ApiError(`Order not found with ID: ${req.params.id}`, 404));
  }

  // Validate status transition
  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.orderStatus];

  if (!allowedTransitions || !allowedTransitions.includes(status)) {
    return next(
      new ApiError(
        `Invalid status transition: "${order.orderStatus}" → "${status}". Allowed: [${allowedTransitions?.join(', ') || 'none'}]`,
        400
      )
    );
  }

  // Handle cancellation — restore stock
  if (status === 'cancelled') {
    await restoreStock(order.orderItems);
    logger.info(`Order cancelled and stock restored: ${order._id}`);
  }

  // Update status
  order.orderStatus = status;

  // Set delivered date and mark payment as paid
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
  createOrderFromCart,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
};
