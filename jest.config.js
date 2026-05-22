require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterFramework: [],
  setupFiles: ['./tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/env.js',
  ],
  coverageDirectory: 'coverage',
};
