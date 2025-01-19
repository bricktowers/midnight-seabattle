import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  verbose: true,
  testTimeout: 100 * 90_000,
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  passWithNoTests: false,
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  resolver: '<rootDir>/js-resolver.cjs',
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'report.xml' }],
    ['jest-html-reporters', { publicPath: 'reports', filename: 'report.html' }],
    ['jest-gh-md-reporter', { publicPath: 'reports', filename: 'test-report.md' }],
  ],
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: './reports/allure-results',
    links: [
      {
        "type": "tms",
        "urlTemplate": "https://bricktowers.atlassian.net/browse/%s"
      }
    ]
  },
  setupFilesAfterEnv: ["<rootDir>/src/test/jest.setup.ts"]
};

export default config;
