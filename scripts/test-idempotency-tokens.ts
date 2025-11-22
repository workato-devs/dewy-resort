/**
 * Test script for idempotency token generation and lookup
 * 
 * Usage: npx tsx scripts/test-idempotency-tokens.ts
 */

import { 
  generateIdempotencyToken, 
  isValidIdempotencyToken,
  findServiceRequestByToken,
  findMaintenanceTaskByToken,
  findTransactionByToken
} from '../lib/utils/idempotency';

console.log('Testing Idempotency Token Utilities\n');
console.log('====================================\n');

// Test 1: Generate multiple tokens
console.log('Test 1: Generate 5 unique tokens');
const tokens = new Set<string>();
for (let i = 0; i < 5; i++) {
  const token = generateIdempotencyToken();
  tokens.add(token);
  console.log(`  Token ${i + 1}: ${token}`);
}
console.log(`  ✓ All tokens are unique: ${tokens.size === 5}\n`);

// Test 2: Validate token format
console.log('Test 2: Validate token format');
const validToken = generateIdempotencyToken();
console.log(`  Valid token: ${validToken}`);
console.log(`  ✓ Is valid: ${isValidIdempotencyToken(validToken)}\n`);

// Test 3: Test invalid tokens
console.log('Test 3: Test invalid token formats');
const invalidTokens = [
  'not-a-uuid',
  '12345678-1234-1234-1234-123456789012', // Wrong version
  'invalid',
  '',
  '00000000-0000-0000-0000-000000000000', // Nil UUID (technically valid but not v4)
];

invalidTokens.forEach(token => {
  const isValid = isValidIdempotencyToken(token);
  console.log(`  "${token}": ${isValid ? '✓ valid' : '✗ invalid'}`);
});

// Test 4: Test database lookup functions
console.log('\nTest 4: Test database lookup functions');
const testToken = generateIdempotencyToken();
console.log(`  Test token: ${testToken}`);

const serviceRequest = findServiceRequestByToken(testToken);
console.log(`  ✓ Service request lookup: ${serviceRequest ? 'found' : 'not found (expected)'}`);

const maintenanceTask = findMaintenanceTaskByToken(testToken);
console.log(`  ✓ Maintenance task lookup: ${maintenanceTask ? 'found' : 'not found (expected)'}`);

const transaction = findTransactionByToken(testToken);
console.log(`  ✓ Transaction lookup: ${transaction ? 'found' : 'not found (expected)'}`);

console.log('\n✓ All tests completed');
