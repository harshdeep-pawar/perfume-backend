/**
 * Cart Controller
 * ---------------
 * Handles shopping cart operations for authenticated users.
 * Each user has a single cart (created on first add).
 *
 * Endpoints:
 * GET    /api/v1/cart          - Get user's cart
 * POST   /api/v1/cart          - Add item to cart
 * PUT    /api/v1/cart/:itemId  - Update item quantity
 * DELETE /api/v1/cart/:itemId  - Remove item from cart
 * DELETE /api/v1/cart          - Clear entire cart
 */

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * @desc    Get current user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
const getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate(
    'items.product',
    'name price stock images'
  );

  if (!cart) {
    // Return empty cart if none exists
    return res.status(200).json({
      success: true,
      cart: {
        items: [],
        totalPrice: 0,
        totalItems: 0,
      },
    });
  }

  res.status(200).json({
    success: true,
    cart,
  });
});

/**
 * @desc    Add item to cart (or update quantity if already exists)
 * @route   POST /api/v1/cart
 * @access  Private
 *
 * Body: { productId: "...", quantity: 2 }
 */
const addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return next(new ApiError('Please provide a product ID.', 400));
  }

  // Validate quantity
  if (quantity < 1) {
    return next(new ApiError('Quantity must be at least 1.', 400));
  }

  // Find the product
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ApiError('Product not found.', 404));
  }

  // Check stock availability
  if (product.stock < quantity) {
    return next(
      new ApiError(`Insufficient stock. Only ${product.stock} items available.`, 400)
    );
  }

  // Find or create cart for user
  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    // Create new cart
    cart = new Cart({
      user: req.user.id,
      items: [],
    });
  }

  // Check if product already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity of existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    // Verify stock
    if (newQuantity > product.stock) {
      return next(
        new ApiError(
          `Cannot add more. Only ${product.stock} items available (${cart.items[existingItemIndex].quantity} already in cart).`,
          400
        )
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    logger.info(`Cart item quantity updated for user ${req.user.email}: ${product.name}`);
  } else {
    // Add new item to cart
    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      image: product.images && product.images.length > 0 ? product.images[0].url : '',
      quantity,
    });
    logger.info(`Item added to cart for user ${req.user.email}: ${product.name}`);
  }

  // Save cart (triggers pre-save hook for total calculation)
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item added to cart successfully',
    cart,
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/:itemId
 * @access  Private
 *
 * Body: { quantity: 3 }
 */
const updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  if (!quantity || quantity < 1) {
    return next(new ApiError('Please provide a valid quantity (minimum 1).', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new ApiError('Cart not found.', 404));
  }

  // Find the item in cart
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return next(new ApiError('Item not found in cart.', 404));
  }

  // Verify stock
  const product = await Product.findById(cart.items[itemIndex].product);
  if (product && quantity > product.stock) {
    return next(
      new ApiError(`Insufficient stock. Only ${product.stock} items available.`, 400)
    );
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;

  // Update price in case it changed
  if (product) {
    cart.items[itemIndex].price = product.price;
  }

  await cart.save();

  logger.info(`Cart item updated for user ${req.user.email}: quantity = ${quantity}`);

  res.status(200).json({
    success: true,
    message: 'Cart item updated successfully',
    cart,
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/:itemId
 * @access  Private
 */
const removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new ApiError('Cart not found.', 404));
  }

  // Filter out the item
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

  if (cart.items.length === originalLength) {
    return next(new ApiError('Item not found in cart.', 404));
  }

  await cart.save();

  logger.info(`Item removed from cart for user ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Item removed from cart successfully',
    cart,
  });
});

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
const clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return res.status(200).json({
      success: true,
      message: 'Cart is already empty',
    });
  }

  await Cart.findByIdAndDelete(cart._id);

  logger.info(`Cart cleared for user ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
