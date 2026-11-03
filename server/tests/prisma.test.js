import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const prismaConfigPath = nodeRequire.resolve('../src/config/prisma.js');
const prismaClientPath = nodeRequire.resolve('@prisma/client');

describe('prisma client configuration', () => {
  let capturedOptions;
  let instanceCount;

  beforeEach(() => {
    capturedOptions = null;
    instanceCount = 0;

    delete require.cache[prismaClientPath];
    require.cache[prismaClientPath] = {
      id: prismaClientPath,
      filename: prismaClientPath,
      loaded: true,
      exports: {
        PrismaClient: function PrismaClient(options) {
          instanceCount++;
          capturedOptions = options;
          this.$queryRaw = () => {};
          this.$connect = () => {};
          this.$disconnect = () => {};
          this.$transaction = () => {};
        },
      },
      children: [],
      paths: [],
    };

    delete require.cache[prismaConfigPath];
  });

  it('creates a PrismaClient instance', () => {
    const prisma = nodeRequire('../src/config/prisma.js');
    expect(instanceCount).toBe(1);
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty('$queryRaw');
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
    expect(prisma).toHaveProperty('$transaction');
  });

  it('configures warn+error logging in development', () => {
    process.env.NODE_ENV = 'development';
    nodeRequire('../src/config/prisma.js');
    expect(capturedOptions).toEqual({ log: ['warn', 'error'] });
  });

  it('configures error-only logging in production', () => {
    process.env.NODE_ENV = 'production';
    nodeRequire('../src/config/prisma.js');
    expect(capturedOptions).toEqual({ log: ['error'] });
  });
});
