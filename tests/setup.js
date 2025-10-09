// Jest setup file for behavioral fakes instead of mocks
// Following Pragmatic Test Architect philosophy: real behavior over mocked verification

const { TabStormTestEnvironment } = require('./behavioral-fakes');

// Create a shared test environment for all tests
global.testEnv = new TabStormTestEnvironment();

// Make behavioral fakes available globally
global.chrome = global.testEnv.chrome;
global.fetch = global.testEnv.fetch;

// Mock console methods to reduce noise but keep errors
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error and assert for debugging
  error: console.error,
  assert: console.assert
};

// Clean up after each test
afterEach(() => {
  global.testEnv.reset();
});
