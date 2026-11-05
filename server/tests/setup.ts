process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://127.0.0.1:5432/verity_test?schema=public';
process.env.JWT_SECRET ??= 'unit-test-secret-long-enough-for-jwt-signing';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.BCRYPT_ROUNDS ??= '10';
