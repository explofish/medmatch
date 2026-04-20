# Testing Guide

This guide explains how to run the comprehensive test suite for the signup API.

## Test Framework

- **Framework**: Jest
- **HTTP Testing**: Supertest
- **Coverage**: Built-in Jest coverage

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode (for development)
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test -- tests/auth.test.js
```

### Run Tests Matching a Pattern
```bash
npm test -- --testNamePattern="Input Validation"
```

## Test Structure

### Auth Test Suite (`tests/auth.test.js`)

The comprehensive test suite covers:

#### 1. Input Validation Tests
- **Email Validation**: Valid/invalid formats, normalization to lowercase
- **Password Validation**: Min 8 chars, uppercase/lowercase/numbers acceptance
- **Required Fields**: Missing email, missing password, empty body
- **Optional Fields**: Graduation year, specialty, location validation

#### 2. Business Logic Tests
- **User Creation**: Correct data structure, default values
- **Password Hashing**: Bcrypt hashing verification, salt rounds ≥ 10
- **Duplicate Detection**: 409 response for existing emails
- **Profile Creation**: Graduate profile with location parsing
- **Email Verification Token**: 24-hour expiry token creation

#### 3. API Endpoint Tests
- **POST /api/auth/signup**: 201 success, 400 validation errors, 409 duplicates
- **Response Headers**: Content-type verification

#### 4. Database Tests
- **User Record Creation**: Correct INSERT query structure
- **Timestamps**: created_at field populated

#### 5. Security Tests
- **SQL Injection**: Parameterized query verification
- **XSS Prevention**: Safe handling of malicious input
- **Input Sanitization**: Long inputs, non-string values

#### 6. Error Handling
- **Database Errors**: 500 responses for DB failures

#### 7. Response Format
- **Success Responses**: Consistent structure, no password leakage
- **Error Responses**: Consistent error format

#### 8. Edge Cases
- **Email Subaddressing**: Plus sign handling
- **International Domains**: Unicode domain handling
- **Concurrent Requests**: Race condition handling

## Coverage Target

Target: >80% coverage for the signup API endpoint

Current coverage focuses on:
- Input validation paths
- Success/failure response paths
- Database interaction paths
- Security check paths

## CI/CD Integration

See `.github/workflows/test.yml` for automated test runs on git push.

## Mocking Strategy

The test suite uses Jest mocks for:
- Database queries (`app.locals.db.query`)
- No external API calls during tests
- Deterministic test results

## Adding New Tests

When adding new tests:
1. Clear mocks in `beforeEach`
2. Set up mock responses in order of query execution
3. Verify both status codes and response bodies
4. Test error cases as well as success cases
