/**
 * jest.config.js
 * Configuration file for the Jest test runner.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],

  collectCoverage: true,

  collectCoverageFrom: [
    'sockets/services/**/*.js',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'json', 'clover'],

  coverageThreshold: {
    './sockets/services/**/*.js': {
      statements: 90,
      branches: 85,
      functions: 80,
      lines: 90,
    },
  },
};