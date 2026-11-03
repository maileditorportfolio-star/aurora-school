import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupApp } from './helpers/app.js';
import { nodeRequire } from './helpers/prisma-mock.js';

setupApp();

const { notFound, errorHandler } = nodeRequire('../../src/middleware/error.js');
const tracker = nodeRequire('../../src/config/error-tracker.js');
const env = nodeRequire('../../src/config/env.js');
const ApiError = nodeRequire('../../src/utils/ApiError.js');

const createRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

const createReq = (overrides = {}) => ({
  method: 'POST',
  originalUrl: '/api/fees',
  user: { id: 'user-customer' },
  ...overrides,
});

const runHandler = (error, req = createReq()) => {
  const res = createRes();
  errorHandler(error, req, res, vi.fn());
  return res;
};

const recordingSentry = () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
});

describe('notFound middleware', () => {
  it('forwards a 404 ApiError for unknown routes', () => {
    const next = vi.fn();

    notFound(createReq({ method: 'GET', originalUrl: '/api/missing' }), createRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('GET /api/missing');
  });
});

describe('errorHandler middleware', () => {
  beforeEach(() => tracker.resetErrorTracking());

  afterEach(() => {
    env.isProduction = false;
    tracker.resetErrorTracking();
  });

  it('returns the message and field details for known client errors', () => {
    const error = ApiError.badRequest('Invalid fee payload', [
      { field: 'items', message: 'At least one item is required' },
    ]);

    const res = runHandler(error);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid fee payload',
      details: [{ field: 'items', message: 'At least one item is required' }],
    });
  });

  it('does not report expected 4xx errors to the tracker', () => {
    const sentry = recordingSentry();
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    runHandler(ApiError.unauthorized());

    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports unexpected failures to the tracker with request context', () => {
    const sentry = recordingSentry();
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });
    const error = new Error('connection refused');

    runHandler(error);

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        method: 'POST',
        url: '/api/fees',
        userId: 'user-customer',
        statusCode: 500,
      },
    });
  });

  it('reports 5xx ApiErrors as well', () => {
    const sentry = recordingSentry();
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });
    const error = new ApiError(503, 'Upstream unavailable');

    runHandler(error);

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException.mock.calls[0][1].extra.statusCode).toBe(503);
  });

  it('returns a generic message in production without leaking the stack trace', () => {
    env.isProduction = true;
    const error = new Error('Prisma failed at src/controllers/fees.controller.js:42');

    const res = runHandler(error);
    const serialised = JSON.stringify(res.body);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Something went wrong on our side. Please try again.',
    });
    expect(serialised).not.toContain('Prisma failed');
    expect(serialised).not.toContain('fees.controller.js');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('exposes the message but never the stack trace outside production', () => {
    const error = new Error('database exploded');
    error.stack = 'Error: database exploded\n    at secret/path.js:1:1';

    const res = runHandler(error);

    expect(res.body.message).toBe('database exploded');
    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('secret/path.js');
  });

  it('falls back to 500 when an error carries an unknown status', () => {
    const error = new Error('weird');
    error.status = 500;

    const res = runHandler(error);

    expect(res.statusCode).toBe(500);
  });
});

describe('errorHandler Prisma mapping', () => {
  it('maps P2002 unique violations to 409 with field details', () => {
    const prismaError = new Error('Unique constraint failed on the fields: (`admissionNo`)');
    prismaError.code = 'P2002';
    prismaError.meta = { target: ['admissionNo'] };

    const res = runHandler(prismaError);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: 'That value is already in use',
      details: [{ field: 'admissionNo', message: 'Already in use' }],
    });
  });
});
