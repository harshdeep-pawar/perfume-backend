/**
 * Async Handler Wrapper
 * ---------------------
 * Wraps async route handlers to automatically catch errors
 * and pass them to the Express error handling middleware.
 * Eliminates the need for try-catch blocks in every controller.
 *
 * Usage: router.get('/route', catchAsync(controllerFunction));
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
