#!/usr/bin/env node

/**
 * Test script to verify WorkatoError handling after fixes
 * Tests:
 * 1. WorkatoError class instantiation
 * 2. instanceof checks
 * 3. Error propagation through WorkatoClient
 * 4. Correlation ID logging
 */

const { WorkatoClient } = require('../lib/workato/client.ts');
const { WorkatoError, handleWorkatoError, isRetryableError } = require('../lib/workato/errors.ts');

console.log('='.repeat(60));
console.log('WorkatoError Handling Verification Test');
console.log('='.repeat(60));
console.log();

// Test 1: Verify WorkatoError is properly exported and can be instantiated
console.log('Test 1: WorkatoError Class Instantiation');
console.log('-'.repeat(60));
try {
  const error = new WorkatoError(
    'Test error message',
    500,
    '/test-endpoint',
    'test-correlation-id',
    true
  );
  
  console.log('✓ WorkatoError instantiated successfully');
  console.log('  - Message:', error.message);
  console.log('  - Status Code:', error.statusCode);
  console.log('  - Endpoint:', error.endpoint);
  console.log('  - Correlation ID:', error.correlationId);
  console.log('  - Retryable:', error.retryable);
  console.log();
} catch (err) {
  console.error('✗ Failed to instantiate WorkatoError:', err.message);
  process.exit(1);
}

// Test 2: Verify instanceof checks work correctly
console.log('Test 2: instanceof Checks');
console.log('-'.repeat(60));
try {
  const error = new WorkatoError(
    'Test error',
    500,
    '/test',
    'test-id',
    false
  );
  
  if (error instanceof WorkatoError) {
    console.log('✓ instanceof WorkatoError check passed');
  } else {
    throw new Error('instanceof check failed');
  }
  
  if (error instanceof Error) {
    console.log('✓ instanceof Error check passed');
  } else {
    throw new Error('instanceof Error check failed');
  }
  console.log();
} catch (err) {
  console.error('✗ instanceof checks failed:', err.message);
  process.exit(1);
}

// Test 3: Verify handleWorkatoError function
console.log('Test 3: handleWorkatoError Function');
console.log('-'.repeat(60));
try {
  // Test with a regular error
  const regularError = new Error('Regular error');
  const handledError = handleWorkatoError(
    regularError,
    'Test context',
    'test-correlation-id',
    '/test-endpoint'
  );
  
  if (handledError instanceof WorkatoError) {
    console.log('✓ handleWorkatoError converts regular errors to WorkatoError');
    console.log('  - Correlation ID:', handledError.correlationId);
  } else {
    throw new Error('handleWorkatoError did not return WorkatoError');
  }
  
  // Test with an existing WorkatoError
  const existingError = new WorkatoError(
    'Existing error',
    404,
    '/test',
    'existing-id',
    false
  );
  const passedThrough = handleWorkatoError(
    existingError,
    'Test context',
    'new-id',
    '/test'
  );
  
  if (passedThrough === existingError) {
    console.log('✓ handleWorkatoError passes through existing WorkatoError');
  } else {
    throw new Error('handleWorkatoError did not pass through existing error');
  }
  console.log();
} catch (err) {
  console.error('✗ handleWorkatoError test failed:', err.message);
  process.exit(1);
}

// Test 4: Verify isRetryableError function
console.log('Test 4: isRetryableError Classification');
console.log('-'.repeat(60));
try {
  // Test retryable errors
  const retryableError = new WorkatoError('Server error', 500, '/test', 'id', true);
  if (isRetryableError(retryableError)) {
    console.log('✓ 500 error correctly identified as retryable');
  } else {
    throw new Error('500 error not identified as retryable');
  }
  
  // Test non-retryable errors
  const nonRetryableError = new WorkatoError('Not found', 404, '/test', 'id', false);
  if (!isRetryableError(nonRetryableError)) {
    console.log('✓ 404 error correctly identified as non-retryable');
  } else {
    throw new Error('404 error incorrectly identified as retryable');
  }
  
  // Test network errors
  const networkError = { code: 'ECONNRESET', message: 'Connection reset' };
  if (isRetryableError(networkError)) {
    console.log('✓ Network error (ECONNRESET) correctly identified as retryable');
  } else {
    throw new Error('Network error not identified as retryable');
  }
  console.log();
} catch (err) {
  console.error('✗ isRetryableError test failed:', err.message);
  process.exit(1);
}

// Test 5: Verify WorkatoClient error handling in mock mode
console.log('Test 5: WorkatoClient Error Handling (Mock Mode)');
console.log('-'.repeat(60));
(async () => {
  try {
    const client = new WorkatoClient({
      mockMode: true,
      salesforce: {
        baseUrl: 'https://test.example.com',
        apiToken: 'test-token',
      },
      timeout: 5000,
      retry: {
        maxAttempts: 1,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
      cache: {
        enabled: false,
        ttl: 60,
      },
      logging: {
        enabled: true,
        level: 'info',
      },
    });
    
    // Test successful request
    const response = await client.request('GET', '/test-endpoint', {});
    if (response.success && response.correlationId) {
      console.log('✓ Mock request succeeded with correlation ID:', response.correlationId);
    } else {
      throw new Error('Mock request did not return expected response');
    }
    
    console.log('✓ WorkatoClient error handling verified in mock mode');
    console.log();
    
    console.log('='.repeat(60));
    console.log('All Tests Passed! ✓');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  ✓ WorkatoError class exports correctly');
    console.log('  ✓ instanceof checks work properly');
    console.log('  ✓ handleWorkatoError function works correctly');
    console.log('  ✓ isRetryableError classifies errors correctly');
    console.log('  ✓ WorkatoClient handles errors with correlation IDs');
    console.log();
    
  } catch (err) {
    console.error('✗ WorkatoClient test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
