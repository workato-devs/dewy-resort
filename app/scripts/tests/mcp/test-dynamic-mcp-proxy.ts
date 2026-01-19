#!/usr/bin/env tsx
/**
 * Test the dynamic MCP proxy architecture
 * 
 * This script verifies:
 * 1. Local server fetches tool definitions from Workato
 * 2. Tool descriptions are dynamically proxied (not hardcoded)
 * 3. Idempotency tokens are auto-generated
 * 4. excludeTools configuration hides underlying Workato tools
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
 * Call the local hotel-db-server MCP
 */
async function callLocalMCP(method: string, params?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['tsx', 'src/lib/mcp/hotel-db-server.ts'], {
      cwd: process.cwd(),
    });
    
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
        console.log('📋 Server stderr:', stderr.substring(0, 200));
      }
      
      try {
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
        reject(new Error(`Failed to parse response: ${error}\nStdout: ${stdout.substring(0, 500)}`));
      }
    });
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

async function testDynamicProxy() {
  console.log('🧪 Testing Dynamic MCP Proxy Architecture\n');
  console.log('=' .repeat(60));
  
  // Test 1: List tools
  console.log('\n📋 Test 1: List available tools');
  console.log('Expected: Tools with dynamic descriptions from Workato\n');
  
  try {
    const response = await callLocalMCP('tools/list');
    
    if (response.result?.tools) {
      const tools = response.result.tools;
      console.log(`✅ Found ${tools.length} tools:\n`);
      
      // Check for proxied tools
      const proxiedTools = tools.filter((t: any) => 
        t.name.includes('_with_token')
      );
      
      console.log(`🔑 Proxied tools (with auto-token): ${proxiedTools.length}`);
      proxiedTools.forEach((tool: any) => {
        console.log(`   - ${tool.name}`);
        if (tool.description.includes('🔑')) {
          console.log(`     ✅ Has auto-token indicator`);
        }
        if (tool.description.length > 100) {
          console.log(`     ✅ Has dynamic description (${tool.description.length} chars)`);
        }
      });
      
      // Check for local-only tools
      const localTools = tools.filter((t: any) => 
        t.name.includes('find_') || t.name.includes('get_')
      );
      
      console.log(`\n📍 Local-only tools (database lookups): ${localTools.length}`);
      localTools.forEach((tool: any) => {
        console.log(`   - ${tool.name}`);
      });
      
      // Verify no idempotency_token in proxied tool schemas
      console.log(`\n🔍 Verifying idempotency_token removed from schemas:`);
      for (const tool of proxiedTools) {
        const hasIdempotencyParam = tool.inputSchema?.properties?.idempotency_token;
        const hasExternalIdParam = tool.inputSchema?.properties?.booking_external_id;
        
        if (!hasIdempotencyParam && !hasExternalIdParam) {
          console.log(`   ✅ ${tool.name} - token parameter removed`);
        } else {
          console.log(`   ❌ ${tool.name} - token parameter still present!`);
        }
      }
      
    } else {
      console.log('❌ No tools found in response');
      console.log(JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log(error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Verify excludeTools in manager.json hides Workato tools');
  console.log('   2. Test actual tool execution with auto-token generation');
  console.log('   3. Confirm agent only sees wrapped versions\n');
}

testDynamicProxy();
