import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nodeRequire } from './helpers/prisma-mock.js';

const tracker = nodeRequire('../../src/config/error-tracker.js');

const fakeSentry = () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
});

describe('error tracking', () => {
  beforeEach(() => tracker.resetErrorTracking());

  it('stays disabled when no DSN is configured', () => {
    expect(tracker.initErrorTracking({ dsn: '' })).toBe(false);
    expect(tracker.isEnabled()).toBe(false);
    expect(tracker.captureException(new Error('boom'))).toBe(false);
  });

  it('initialises the SDK with the DSN and privacy defaults', () => {
    const sentry = fakeSentry();

    const enabled = tracker.initErrorTracking({
      dsn: 'https://key@sentry.example.com/1',
      client: sentry,
      environment: 'test',
      release: 'v1.2.3',
      tracesSampleRate: 0.1,
    });

    expect(enabled).toBe(true);
    expect(tracker.isEnabled()).toBe(true);
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.example.com/1',
        environment: 'test',
        release: 'v1.2.3',
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      }),
    );
  });

  it('omits the release when it is not configured', () => {
    const sentry = fakeSentry();

    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    expect(sentry.init.mock.calls[0][0]).not.toHaveProperty('release');
  });

  it('captures exceptions together with the request context', () => {
    const sentry = fakeSentry();
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    const error = new Error('database exploded');
    const captured = tracker.captureException(error, { method: 'GET', url: '/api/orders' });

    expect(captured).toBe(true);
    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { method: 'GET', url: '/api/orders' },
    });
  });

  it('degrades gracefully when the SDK cannot initialise', () => {
    const sentry = {
      init: vi.fn(() => {
        throw new Error('offline');
      }),
    };

    expect(
      tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry }),
    ).toBe(false);
    expect(tracker.isEnabled()).toBe(false);
  });

  it('never lets a reporting failure reach the request pipeline', () => {
    const sentry = {
      init: vi.fn(),
      captureException: vi.fn(() => {
        throw new Error('transport closed');
      }),
    };
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    expect(tracker.captureException(new Error('boom'))).toBe(false);
  });

  it('flushes buffered events before shutdown', async () => {
    const sentry = fakeSentry();
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    await expect(tracker.flushErrorTracking(500)).resolves.toBe(true);
    expect(sentry.flush).toHaveBeenCalledWith(500);
  });

  it('does not flush when tracking is disabled', async () => {
    await expect(tracker.flushErrorTracking()).resolves.toBe(false);
  });

  it('survives a failing flush', async () => {
    const sentry = {
      init: vi.fn(),
      captureException: vi.fn(),
      flush: vi.fn().mockRejectedValue(new Error('timeout')),
    };
    tracker.initErrorTracking({ dsn: 'https://key@sentry.example.com/1', client: sentry });

    await expect(tracker.flushErrorTracking()).resolves.toBe(false);
  });
});
