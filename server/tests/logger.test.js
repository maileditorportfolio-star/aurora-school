import { describe, it, expect } from 'vitest';
import { pino } from 'pino';
import { nodeRequire } from './helpers/prisma-mock.js';

const logger = nodeRequire('../../src/config/logger.js');

const collect = (payload) => {
  const lines = [];
  const instance = pino(
    { ...logger.options, level: 'info', transport: undefined },
    { write: (line) => lines.push(line) },
  );
  instance.info(payload, 'test message');
  return lines.join('');
};

describe('logger', () => {
  it('is silent during test runs', () => {
    expect(logger.level).toBe('silent');
  });

  it('tags every record with the service name and environment', () => {
    const output = collect({ event: 'boot' });

    expect(JSON.parse(output).service).toBe('aurora-school-api');
    expect(JSON.parse(output).env).toBe('test');
  });

  it('redacts authorization headers', () => {
    const output = collect({ req: { headers: { authorization: 'Bearer super-secret-token' } } });

    expect(output).not.toContain('super-secret-token');
    expect(JSON.parse(output).req.headers.authorization).toBe('[redacted]');
  });

  it('redacts passwords and password hashes at any depth', () => {
    const output = collect({
      password: 'hunter2',
      user: { passwordHash: '$2b$12$abcdefghijklmnopqrstuv' },
    });

    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('abcdefghijklmnopqrstuv');
  });

  it('keeps non-sensitive fields intact', () => {
    const output = collect({ email: 'parent@aurora.school', admissionNo: 'ADV-2026-0001' });
    const record = JSON.parse(output);

    expect(record.email).toBe('parent@aurora.school');
    expect(record.admissionNo).toBe('ADV-2026-0001');
  });
});
