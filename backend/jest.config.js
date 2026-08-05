/**
 * jest.config.js
 * Configuration file for the Jest test runner.
 * Configures test matching, environments, and code coverage thresholds.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'sockets/services/**/*.js',
    'sockets/quizEngine.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'clover'],
  coverageThreshold: {
    // High standard thresholds for pure business logic services
    './sockets/services/**/*.js': {
      statements: 90,
      branches: 85,
      functions: 80,
      lines: 90,
    },
    // Lower baseline thresholds for orchestrator/socket setup files until later phases
    './sockets/quizEngine.js': {
      statements: 25,
      branches: 8,
      functions: 15,
      lines: 25,
    }
  },
};
