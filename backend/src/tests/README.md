# ClickView Backend - Integration Tests

## Overview

This directory contains integration tests for the ClickView backend API, focusing on authentication and authorization flows.

## Test Structure

```
tests/
├── setup.ts                      # Test setup and utilities
├── integration/
│   ├── auth.test.ts             # Authentication tests
│   └── authorization.test.ts    # Authorization (RBAC/ABAC) tests
└── README.md                    # This file
```

## Prerequisites

### 1. Test Database

Create a separate PostgreSQL database for testing:

```sql
CREATE DATABASE clickview_test;
CREATE USER clickview_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE clickview_test TO clickview_user;

-- Connect to test database
\c clickview_test

-- Enable TimescaleDB (if using time-series features)
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 2. Test Redis

Use a separate Redis database (DB 1) for testing to avoid conflicts with development data:

```bash
# Redis will automatically create DB 1 when accessed
# Configure in .env.test: REDIS_TEST_DB=1
```

### 3. Environment Variables

Copy `.env.test` to configure test environment:

```bash
# Already created at backend/.env.test
# Review and adjust settings as needed
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Run Database Migrations

```bash
npm run db:migrate
# Or for test database specifically:
NODE_ENV=test npm run db:migrate
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run in Watch Mode (for development)

```bash
npm run test:watch
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### Run Only Unit Tests (when created)

```bash
npm run test:unit
```

### Run Tests for CI/CD

```bash
npm run test:ci
```

## Test Coverage

The test suite covers:

### Authentication (`auth.test.ts`)

- ✅ **User Registration**
  - Successful registration with valid data
  - Rejection of weak passwords
  - Rejection of duplicate emails/usernames
  - Validation of email format
  - Required field validation

- ✅ **User Login**
  - Login with email and password
  - Login with username and password
  - Rejection of incorrect credentials
  - Rejection of non-existent users
  - Account lockout after failed attempts
  - Inactive user handling
  - MFA requirement detection

- ✅ **Token Management**
  - Access token refresh
  - Refresh token rotation
  - Token expiration handling
  - Invalid token rejection

- ✅ **Session Management**
  - Logout and session revocation
  - Session storage in Redis
  - Session cleanup

- ✅ **Password Reset**
  - Password reset request
  - Password reset confirmation
  - Token validation
  - Password strength enforcement
  - Security (no user enumeration)

- ✅ **Profile Management**
  - Get current user profile
  - Update user profile
  - Email uniqueness validation
  - Password change with current password verification

### Authorization (`authorization.test.ts`)

- ✅ **Role-Based Access Control (RBAC)**
  - Admin access to admin resources
  - User access restrictions
  - Shared resource access (read permissions)
  - Role-specific permissions (delete, etc.)
  - Permission retrieval
  - Bulk permission checks

- ✅ **Attribute-Based Access Control (ABAC)**
  - Organization-based access control
  - Cross-organization access denial
  - Resource ownership validation
  - Organization admin privileges
  - Context-based authorization

- ✅ **Policy Evaluation**
  - Time-based policies
  - Conditional access
  - Policy priority handling

- ✅ **Role Management**
  - Role assignment to users
  - Role revocation from users
  - System role protection
  - Last admin role protection
  - Permission checks for role management

## Test Utilities

The `setup.ts` file provides helper functions:

### Database Helpers

```typescript
// Clear all test data
await clearDatabase();

// Create test users
const user = await createTestUser({
  email: 'test@example.com',
  username: 'testuser'
});

// Create test organizations
const org = await createTestOrganization({
  name: 'Test Org',
  slug: 'test-org'
});

// Create roles and permissions
const role = await createTestRole({ name: 'Editor' });
const permission = await createTestPermission({
  name: 'dashboards:read',
  resource: 'dashboards',
  action: 'read'
});

// Assign relationships
await assignRoleToUser(userId, roleId);
await assignPermissionToRole(roleId, permissionId);
```

### Token Generation

```typescript
// Generate JWT token for testing
const token = generateTestToken(userId);

// Use in API requests
const response = await request(app)
  .get('/api/auth/me')
  .set('Authorization', `Bearer ${token}`);
```

## Writing New Tests

### 1. Create Test File

```typescript
// src/tests/integration/feature.test.ts
import request from 'supertest';
import { clearDatabase, createTestUser } from '../setup';

describe('Feature Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should do something', async () => {
    // Arrange
    const user = await createTestUser();

    // Act
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### 2. Follow AAA Pattern

- **Arrange**: Set up test data and preconditions
- **Act**: Execute the code being tested
- **Assert**: Verify the expected outcome

### 3. Use Descriptive Test Names

```typescript
// Good
it('should reject login with incorrect password', async () => {});

// Bad
it('test login', async () => {});
```

### 4. Test Edge Cases

- Valid inputs
- Invalid inputs
- Missing required fields
- Boundary conditions
- Error scenarios
- Permission checks

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: timescale/timescaledb-ha:pg15-latest
        env:
          POSTGRES_USER: clickview_user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: clickview_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Tests Fail to Connect to Database

1. Verify PostgreSQL is running:
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. Check test database exists:
   ```bash
   psql -U clickview_user -d clickview_test -c "SELECT 1"
   ```

3. Verify .env.test database credentials

### Tests Fail to Connect to Redis

1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis configuration in .env.test

### Tests Timeout

1. Increase Jest timeout in jest.config.js:
   ```javascript
   testTimeout: 60000  // 60 seconds
   ```

2. Check for database connection leaks (ensure pool.end() in cleanup)

### Port Already in Use

Tests use the same ports as development. Stop development servers before running tests, or configure different ports in .env.test.

### Database State Issues

Always use `clearDatabase()` in `beforeEach()` to ensure clean state:

```typescript
beforeEach(async () => {
  await clearDatabase();
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clean State**: Use `beforeEach` to reset database
3. **No Side Effects**: Tests shouldn't affect each other
4. **Fast Execution**: Keep tests fast (< 5s per test)
5. **Descriptive**: Clear test names and assertions
6. **Coverage**: Aim for 80%+ code coverage
7. **Real Scenarios**: Test realistic user workflows
8. **Security**: Test authentication and authorization thoroughly

## Next Steps

1. Add unit tests for services and utilities
2. Add E2E tests for complete user flows
3. Add performance tests for critical endpoints
4. Add security tests (SQL injection, XSS, etc.)
5. Set up mutation testing with Stryker
6. Integrate with SonarQube for code quality

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [ClickView API Documentation](http://localhost:3001/api-docs)
