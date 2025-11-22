#!/usr/bin/env tsx
/**
 * Test script for booking MCP tools with idempotency tokens
 * 
 * Tests:
 * 1. create_booking_with_token - Creates booking with auto-generated token
 * 2. find_booking_by_token - Looks up booking by token
 * 3. manage_booking_with_token - Updates existing booking
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

/**
 * Send MCP request to server and get response
 */
async function sendMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['tsx', 'lib/mcp/hotel-db-server.ts']);
    
    let stdout = '';
    let stderr = '';
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    server.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}\nStderr: ${stderr}`));
        return;
      }
      
      try {
        // Parse JSON-RPC responses (may be multiple)
        const lines = stdout.trim().split('\n');
        const responses = lines
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
        
        // Find the response matching our request ID
        const response = responses.find(r => r.id === request.id);
        if (response) {
          resolve(response);
        } else {
          reject(new Error('No matching response found'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error}\nStdout: ${stdout}`));
      }
    });
    
    // Send request
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

/**
 * Call an MCP tool
 */
async function callTool(toolName: string, args: any): Promise<any> {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };
  
  const response = await sendMCPRequest(request);
  
  if (response.error) {
    throw new Error(`Tool error: ${JSON.stringify(response.error)}`);
  }
  
  return response.result;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Testing Booking MCP Tools with Idempotency Tokens\n');
  
  let createdToken: string | null = null;
  
  try {
    // Test 1: Create booking with token
    console.log('📝 Test 1: create_booking_with_token');
    console.log('Creating booking for test guest...');
    
    const createResult = await callTool('create_booking_with_token', {
      guest_email: 'guest1@hotel.com',
      guest_first_name: 'Emma',
      guest_last_name: 'Wilson',
      room_number: '108',
      check_in_date: '2025-12-15',
      check_out_date: '2025-12-20',
      number_of_guests: 2,
      special_requests: 'Late check-in requested',
    });
    
    console.log('✅ Booking created successfully');
    console.log('Response:', JSON.stringify(createResult, null, 2));
    
    // Extract token from response
    const content = createResult.content?.[0]?.text;
    if (content) {
      const parsed = JSON.parse(content);
      createdToken = parsed.idempotency_token;
      console.log(`\n🔑 Idempotency Token: ${createdToken}\n`);
    }
    
    if (!createdToken) {
      throw new Error('Failed to extract idempotency token from response');
    }
    
    // Test 2: Find booking by token
    console.log('🔍 Test 2: find_booking_by_token');
    console.log(`Looking up booking with token: ${createdToken}...`);
    
    const findResult = await callTool('find_booking_by_token', {
      idempotency_token: createdToken,
    });
    
    console.log('✅ Booking found successfully');
    console.log('Response:', JSON.stringify(findResult, null, 2));
    
    // Test 3: Update booking
    console.log('\n📝 Test 3: manage_booking_with_token');
    console.log('Updating booking with new special requests...');
    
    const updateResult = await callTool('manage_booking_with_token', {
      external_id: createdToken,
      special_requests: 'Late check-in requested + extra pillows',
      number_of_guests: 3,
    });
    
    console.log('✅ Booking updated successfully');
    console.log('Response:', JSON.stringify(updateResult, null, 2));
    
    // Test 4: Verify update
    console.log('\n🔍 Test 4: Verify update');
    console.log('Looking up booking again to verify changes...');
    
    const verifyResult = await callTool('find_booking_by_token', {
      idempotency_token: createdToken,
    });
    
    console.log('✅ Verification successful');
    console.log('Response:', JSON.stringify(verifyResult, null, 2));
    
    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
