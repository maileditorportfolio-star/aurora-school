const pino = require('pino');
const env = require('./env');

const usePrettyTransport = !env.isProduction && env.nodeEnv !== 'test';

/**
 * Structured JSON logger. Pretty output is used for local development so the
 * console stays readable, while production emits one JSON object per line that
 * a log collector can index. Tests run silent to keep the output clean.
 */
const options = {
  level: env.nodeEnv === 'test' ? 'silent' : env.logLevel || (env.isProduction ? 'info' : 'debug'),
  base: { service: 'aurora-school-api', env: env.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'currentPassword',
      'newPassword',
      'passwordHash',
      'token',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[redacted]',
  },
  ...(usePrettyTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
};

const logger = pino(options);

module.exports = logger;
module.exports.options = options;
