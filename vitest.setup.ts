// Set timezone to UTC for consistent test results
// This must be set before any date operations
process.env.TZ = "UTC"

// Set encryption secret for tests (must be at least 32 characters)
process.env.ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  "test-encryption-secret-key-for-testing-only-32-chars-min"
