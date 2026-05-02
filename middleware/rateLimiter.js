/**
 * Granular Rate Limiters
 * ----------------------
 * Provides route-specific rate limiting for sensitive endpoints.
 * Uses express-rate-limit with different configurations per concern.
 *
 * Why granular?
 * - Auth endpoints need stricter limits (brute-force prevention)
 * - Payment endpoints need moderate limits (abuse prevention)
 * - General API has relaxed limits
 */

const rateLimit = require('express-rate-limit');

/**
 * Auth rate limiter — strict
 * Prevents brute-force login/register attacks
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Payment rate limiter — moderate
 * Prevents payment API abuse
 * 20 requests per 15 minutes per IP
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter — relaxed
 * Prevents general API abuse
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, paymentLimiter, apiLimiter };
