const env = require('./env');
const logger = require('./logger');

let client = null;

/**
 * Sentry is loaded lazily so local development, tests and Docker builds never
 * need the SDK to be reachable. Passing a DSN (or a stand-in client) enables it.
 */
const initErrorTracking = (options = {}) => {
  const dsn = options.dsn ?? env.sentry.dsn;

  if (!dsn) {
    client = null;
    return false;
  }

  const environment = options.environment ?? env.sentry.environment;
  const release = options.release ?? env.sentry.release;

  try {
    const sentry = options.client || require('@sentry/node');
    sentry.init({
      dsn,
      environment,
      ...(release ? { release } : {}),
      tracesSampleRate: options.tracesSampleRate ?? env.sentry.tracesSampleRate,
      sendDefaultPii: false,
    });
    client = sentry;
    logger.info({ environment, release }, 'error tracking enabled');
    return true;
  } catch (error) {
    client = null;
    logger.warn({ err: error }, 'error tracking could not be initialised');
    return false;
  }
};

/** Reports an exception to the tracker. Returns false when tracking is off. */
const captureException = (error, context = {}) => {
  if (!client) return false;

  try {
    client.captureException(error, { extra: context });
    return true;
  } catch (reportingError) {
    logger.warn({ err: reportingError }, 'failed to report exception');
    return false;
  }
};

/** Flushes buffered events before shutdown. No-op when tracking is off. */
const flushErrorTracking = async (timeoutMs = 2000) => {
  if (!client || typeof client.flush !== 'function') return false;

  try {
    await client.flush(timeoutMs);
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'failed to flush error tracking');
    return false;
  }
};

const isEnabled = () => client !== null;

/** Test helper: forget the configured client so specs start from a clean slate. */
const resetErrorTracking = () => {
  client = null;
};

module.exports = {
  initErrorTracking,
  captureException,
  flushErrorTracking,
  isEnabled,
  resetErrorTracking,
};
