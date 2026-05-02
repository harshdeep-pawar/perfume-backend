/**
 * Express Application Configuration
 * -----------------------------------
 * Central application setup with all middleware, routes, and error handling.
 *
 * Middleware Stack (order matters):
 * 1. Security headers (Helmet)
 * 2. CORS
 * 3. Body parsing (JSON + URL-encoded)
 * 4. Cookie parsing
 * 5. HTTP request logging (Morgan)
 * 6. API Routes (with granular rate limiting)
 * 7. Swagger Documentation
 * 8. Global Error Handler
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

// Internal imports
const swaggerSpec = require('./config/swagger');
const errorMiddleware = require('./middleware/error');
const { authLimiter, paymentLimiter, apiLimiter } = require('./middleware/rateLimiter');
const ApiError = require('./utils/apiError');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express app
const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Set security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ==========================================
// BODY PARSING MIDDLEWARE
// ==========================================

// Parse JSON bodies (limit 10kb for security)
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies
app.use(cookieParser());

// ==========================================
// LOGGING MIDDLEWARE
// ==========================================

// HTTP request logging with Morgan (stream to Winston in production)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// ==========================================
// RATE LIMITING (Granular per route group)
// ==========================================

// General API rate limiter
app.use('/api', apiLimiter);

// Strict rate limiting for auth endpoints
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Moderate rate limiting for payment endpoints
app.use('/api/v1/payments', paymentLimiter);

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Perfume E-commerce API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/payments', paymentRoutes);

// ==========================================
// API DOCUMENTATION (Swagger)
// ==========================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Perfume E-commerce API Docs',
}));

// ==========================================
// ERROR HANDLING
// ==========================================

// Handle undefined routes (404)
app.use((req, res, next) => {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// Global error handler (must be last middleware)
app.use(errorMiddleware);

module.exports = app;
