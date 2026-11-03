/**
 * Wraps an async route handler so rejected promises reach the Express error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
