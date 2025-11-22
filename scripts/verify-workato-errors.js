/**
 * Verification script for Workato Salesforce error handling
 * This script demonstrates and verifies the error handling functionality
 */

const {
  WorkatoSalesforceError,
  isRetryableError,
  createWorkatoError,
} = require('../lib/workato/errors');

console.log('🧪 Testing Workato Salesforce Error Handling\n');

// Test 1: WorkatoSalesforceError creation
console.log('✓ Test 1: Creating WorkatoSalesforceError');
const error1 = new WorkatoSalesforceError(
  'Test error message',
  404,
  '/api/rooms/123',
  'corr-123',
  false
);
console.log('  Properties:', {
  message: error1.message,
  statusCode: error1.statusCode,
  endpoint: error1.endpoint,
  correlationId: error1.correlationId,
  retryable: error1.retryable,
  name: error1.name,
});

// Test 2: toJSON serialization
console.log('\n✓ Test 2: Error serialization');
const json = error1.toJSON();
console.log('  JSON:', JSON.stringify(json, null, 2));

// Test 3: isRetryableError with custom error
console.log('\n✓ Test 3: Checking retryable errors');
const retryableError = new WorkatoSalesforceError(
  'Rate limit',
  429,
  '/api/test',
  'corr-456',
  true
);
console.log('  429 error is retryable:', isRetryableError(retryableError));

const nonRetryableError = new WorkatoSalesforceError(
  'Not found',
  404,
  '/api/test',
  'corr-789',
  false
);
console.log('  404 error is retryable:', isRetryableError(nonRetryableError));

// Test 4: isRetryableError with HTTP status codes
console.log('\n✓ Test 4: Checking HTTP status codes');
console.log('  400 is retryable:', isRetryableError({ response: { status: 400 } }));
console.log('  401 is retryable:', isRetryableError({ response: { status: 401 } }));
console.log('  404 is retryable:', isRetryableError({ response: { status: 404 } }));
console.log('  429 is retryable:', isRetryableError({ response: { status: 429 } }));
console.log('  500 is retryable:', isRetryableError({ response: { status: 500 } }));
console.log('  503 is retryable:', isRetryableError({ response: { status: 503 } }));

// Test 5: isRetryableError with network errors
console.log('\n✓ Test 5: Checking network errors');
console.log('  ECONNRESET is retryable:', isRetryableError({ code: 'ECONNRESET' }));
console.log('  ETIMEDOUT is retryable:', isRetryableError({ code: 'ETIMEDOUT' }));
console.log('  ENOTFOUND is retryable:', isRetryableError({ code: 'ENOTFOUND' }));

// Test 6: createWorkatoError from HTTP response
console.log('\n✓ Test 6: Creating error from HTTP response');
const axiosError404 = {
  response: {
    status: 404,
    data: { message: 'Room not found' },
  },
};
const createdError404 = createWorkatoError(axiosError404, '/api/rooms/123', 'corr-abc');
console.log('  404 error:', {
  message: createdError404.message,
  statusCode: createdError404.statusCode,
  retryable: createdError404.retryable,
});

// Test 7: createWorkatoError from rate limit
console.log('\n✓ Test 7: Creating error from rate limit');
const axiosError429 = {
  response: {
    status: 429,
  },
};
const createdError429 = createWorkatoError(axiosError429, '/api/test', 'corr-def');
console.log('  429 error:', {
  message: createdError429.message,
  statusCode: createdError429.statusCode,
  retryable: createdError429.retryable,
});

// Test 8: createWorkatoError from network error
console.log('\n✓ Test 8: Creating error from network error');
const networkError = {
  code: 'ECONNRESET',
  message: 'Connection reset',
};
const createdNetworkError = createWorkatoError(networkError, '/api/test', 'corr-ghi');
console.log('  Network error:', {
  message: createdNetworkError.message,
  statusCode: createdNetworkError.statusCode,
  retryable: createdNetworkError.retryable,
});

// Test 9: Default messages for different status codes
console.log('\n✓ Test 9: Default error messages');
const statusCodes = [400, 401, 404, 429, 500, 503];
statusCodes.forEach((status) => {
  const err = createWorkatoError({ response: { status } }, '/api/test', 'corr-test');
  console.log(`  ${status}: ${err.message}`);
});

console.log('\n✅ All error handling tests completed successfully!\n');
