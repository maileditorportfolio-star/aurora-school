process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.BCRYPT_ROUNDS = '4';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-aurora-school';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/aurora_school';
