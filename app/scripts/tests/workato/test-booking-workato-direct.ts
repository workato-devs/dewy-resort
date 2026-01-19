#!/usr/bin/env tsx
/**
 * Test direct Workato API call to see the actual response structure
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables manually
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

async function testWorkatoCall() {
  const url = env.MCP_MANAGER_URL;
  const token = env.MCP_MANAGER_TOKEN;
  
  console.log('🧪 Testing Workato Create_booking API\n');
  console.log(`URL: ${url}/Create_booking`);
  console.log(`Token: ${token?.substring(0, 20)}...`);
  
  const payload = {
    guest_email: 'chris.miller+guest@workato.com',
    guest_first_name: 'Chris',
    guest_last_name: 'Miller',
    room_number: '101',
    check_in_date: '2025-11-22',
    check_out_date: '2025-11-24',
    number_of_guests: 1,
    special_requests: 'Test booking',
    booking_external_id: 'test-token-' + Date.now(),
  };
  
  console.log('\n📤 Request payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    // Try JSON-RPC format
    const response = await fetch(`${url}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'Create_booking',
          arguments: payload,
        },
      }),
    });
    
    console.log(`\n📥 Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('\n📄 Raw response text:');
    console.log(responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📋 Parsed JSON response:');
      console.log(JSON.stringify(responseJson, null, 2));
      
      // Check for nested error structure
      if (responseJson.response) {
        console.log('\n⚠️  Response has nested "response" field:');
        console.log(JSON.stringify(responseJson.response, null, 2));
      }
      
      if (responseJson.response?.error_code) {
        console.log('\n❌ Error found in response.error_code:');
        console.log(`   Code: ${responseJson.response.error_code}`);
        console.log(`   Message: ${responseJson.response.error_message}`);
        console.log(`   Details: ${responseJson.response.details}`);
      }
      
    } catch (parseError) {
      console.log('\n❌ Failed to parse response as JSON');
      console.log(`   Error: ${parseError}`);
    }
    
  } catch (error) {
    console.log('\n❌ Request failed:');
    console.log(error);
  }
}

testWorkatoCall();
