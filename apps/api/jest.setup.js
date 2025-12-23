// Jest setup file to configure test environment
// Ensure NODE_ENV is set to 'test' to suppress noisy logs during tests
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

