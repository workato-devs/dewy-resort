#!/usr/bin/env tsx
/**
 * Test the booking MCP wrapper to verify error messages are surfaced correctly
 */

import { spawn } from 'child_process';

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
 * Call the hotel-db-server MCP tool
 */
async function callMCPTool(toolName: string, args: any): Promise<any> {
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
      if (stderr) {
        console.log('📋 Server stderr:', stderr);
      }
      
      try {
        // Parse JSON-RPC responses
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === 1) {
              resolve(response);
              return;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
        
        reject(new Error('No matching response found'));
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error}\nStdout: ${stdout}`));
      }
    });
    
    // Send JSON-RPC request
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

async function testBookingCreation() {
  console.log('🧪 Testing create_booking_with_token MCP wrapper\n');
  
  const testArgs = {
    guest_email: 'chris.miller+guest@workato.com',
    guest_first_name: 'Chris',
    guest_last_name: 'Miller',
    room_number: '101',
    check_in_date: '2025-11-22',
    check_out_date: '2025-11-24',
    number_of_guests: 1,
    special_requests: 'Test booking from MCP wrapper',
  };
  
  console.log('📤 Request arguments:');
  console.log(JSON.stringify(testArgs, null, 2));
  console.log('');
  
  try {
    const response = await callMCPTool('create_booking_with_token', testArgs);
    
    console.log('📥 MCP Response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('');
    
    if (response.error) {
      console.log('❌ MCP Error:');
      console.log(`   Code: ${response.error.code}`);
      console.log(`   Message: ${response.error.message}`);
    } else if (response.result?.isError) {
      console.log('❌ Tool Error:');
      const errorText = response.result.content?.[0]?.text || 'Unknown error';
      console.log(`   ${errorText}`);
    } else {
      console.log('✅ Success:');
      const resultText = response.result?.content?.[0]?.text || JSON.stringify(response.result);
      console.log(resultText);
    }
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log(error);
  }
}

testBookingCreation();
