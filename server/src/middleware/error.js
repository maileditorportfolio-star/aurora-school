const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../config/logger');
const { captureException } = require('../config/error-tracker');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, _next) => {
  // Prisma unique-constraint violation → 409 Conflict, not a 500.
  if (error && error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'That value is already in use',
      details: Array.isArray(error.meta?.target)
        ? error.meta.target.map((field) => ({ field: String(field), message: 'Already in use' }))
        : undefined,
    });
  }

  const isKnown = error instanceof ApiError;
  const isUploadError = error.name === 'MulterError';
  const statusCode = isKnown ? error.statusCode : isUploadError ? 400 : error.status || 500;
  const uploadMessage =
    error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : 'Image upload failed';

  if (!isKnown || statusCode >= 500) {
    logger.error(
      {
        err: error,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
      },
      'request failed',
    );

    if (!isUploadError) {
      captureException(error, {
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        statusCode,
      });
    }
  }

  res.status(statusCode).json({
    success: false,
    message: isUploadError
      ? uploadMessage
      : statusCode >= 500 && !env.isProduction
        ? error.message
        : isKnown
          ? error.message
          : 'Something went wrong on our side. Please try again.',
    ...(isKnown && error.details ? { details: error.details } : {}),
  });
};

module.exports = { notFound, errorHandler };
