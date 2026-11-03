const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/integration/**'],
    clearMocks: true,
    restoreMocks: false,
    reporters: ['default', ['junit', { outputFile: './junit.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js', 'src/socket/**'],
      thresholds: {
        // Gates sit just below the measured suite (see docs/verification.md).
        // Raise them as coverage improves; never lower them to make a build pass.
        statements: 82,
        branches: 60,
        functions: 78,
        lines: 85,
      },
    },
  },
});
