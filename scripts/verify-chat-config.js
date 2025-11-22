#!/usr/bin/env node

/**
 * Verification script for /api/chat/config endpoint
 * 
 * Tests different scenarios:
 * 1. AUTH_PROVIDER not set to "cognito"
 * 2. AUTH_PROVIDER is "cognito" but COGNITO_IDENTITY_POOL_ID not set
 * 3. AUTH_PROVIDER is "cognito" with invalid COGNITO_IDENTITY_POOL_ID format
 * 4. AUTH_PROVIDER is "cognito" with valid COGNITO_IDENTITY_POOL_ID
 */

async function testChatConfig() {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/chat/config`;
  
  console.log('Testing /api/chat/config endpoint...\n');
  
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('\nValidation:');
    
    // Check response structure
    if (typeof data.enabled !== 'boolean') {
      console.error('❌ Missing or invalid "enabled" field');
      process.exit(1);
    }
    
    if (typeof data.features !== 'object') {
      console.error('❌ Missing or invalid "features" field');
      process.exit(1);
    }
    
    if (typeof data.features.streaming !== 'boolean') {
      console.error('❌ Missing or invalid "features.streaming" field');
      process.exit(1);
    }
    
    if (typeof data.features.tools !== 'boolean') {
      console.error('❌ Missing or invalid "features.tools" field');
      process.exit(1);
    }
    
    console.log('✓ Response structure is valid');
    
    // Validate based on response
    console.log('\nValidating response logic:');
    
    if (data.enabled) {
      // When enabled, features should be enabled and no reason should be present
      if (data.reason) {
        console.error('❌ Unexpected "reason" field when enabled=true');
        process.exit(1);
      }
      if (!data.features.streaming || !data.features.tools) {
        console.error('❌ Expected streaming and tools features to be enabled');
        process.exit(1);
      }
      console.log('✓ Correctly enabled with all features');
    } else {
      // When disabled, reason should be present
      if (!data.reason) {
        console.error('❌ Missing "reason" field when enabled=false');
        process.exit(1);
      }
      
      // Validate reason is one of the expected values
      const validReasons = [
        'AI chat requires Cognito authentication',
        'AI chat service not configured',
        'AI chat service temporarily unavailable'
      ];
      
      if (!validReasons.includes(data.reason)) {
        console.error('❌ Unexpected reason:', data.reason);
        process.exit(1);
      }
      
      if (data.features.streaming || data.features.tools) {
        console.error('❌ Expected streaming and tools features to be disabled');
        process.exit(1);
      }
      
      console.log('✓ Correctly disabled with reason:', data.reason);
    }
    
    console.log('\n✅ All validations passed!');
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    process.exit(1);
  }
}

testChatConfig();
