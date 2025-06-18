import { defineConfig } from 'vitest/config';

export default defineConfig({
  mode: 'node',
  test: {
    testTimeout: 1000 * 60 * 45,
    deps: {
      interopDefault: true,
    },
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules'],
    root: '.',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 50,
        functions: 73,
        lines: 72,
        statements: -269,
      },
    },
    reporters: ['default', ['junit', { outputFile: 'reports/report.xml' }]],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    conditions: ['import', 'node', 'default'],
  },
});
