/**
 * Server Entry Point
 * ------------------
 * Boots up the application:
 * 1. Loads environment variables
 * 2. Connects to MongoDB
 * 3. Configures Cloudinary
 * 4. Starts Express server
 * 5. Handles unhandled rejections and uncaught exceptions
 */

// Load environment variables FIRST (before any other imports)
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { connectCloudinary } = require('./config/cloudinary');
const logger = require('./utils/logger');

// ==========================================
// HANDLE UNCAUGHT EXCEPTIONS
// ==========================================
// Must be at the top to catch synchronous errors during startup
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// ==========================================
// INITIALIZE SERVICES & START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Configure Cloudinary
    connectCloudinary();

    // 3. Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // ==========================================
    // HANDLE UNHANDLED PROMISE REJECTIONS
    // ==========================================
    process.on('unhandledRejection', (err) => {
      logger.error(`UNHANDLED REJECTION: ${err.message}`);
      logger.error(err.stack);

      // Gracefully close server, then exit
      server.close(() => {
        process.exit(1);
      });
    });

    // ==========================================
    // HANDLE SIGTERM (Graceful Shutdown)
    // ==========================================
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Boot the server
startServer();
