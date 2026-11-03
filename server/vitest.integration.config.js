const { defineConfig } = require('vitest/config');

/**
 * Runs the specs that need a live MySQL instance. Apply `prisma migrate deploy`
 * and `npm run seed` first; `npm test` never loads this config.
 */
module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    setupFiles: ['./tests/integration/setup.js'],
    reporters: ['default', ['junit', { outputFile: './junit-integration.xml' }]],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
