/**
 * Express Application Configuration
 * -----------------------------------
 * Central application setup with all middleware, routes, and error handling.
 *
 * Middleware Stack (order matters):
 * 1. Security headers (Helmet)
 * 2. CORS
 * 3. Rate limiting
 * 4. Body parsing (JSON + URL-encoded)
 * 5. Cookie parsing
 * 6. HTTP request logging (Morgan)
 * 7. API Routes
 * 8. Swagger Documentation
 * 9. Global Error Handler
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

// Internal imports
const swaggerSpec = require('./config/swagger');
const errorMiddleware = require('./middleware/error');
const ApiError = require('./utils/apiError');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

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

// Rate limiting - prevent brute-force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit per IP
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

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
