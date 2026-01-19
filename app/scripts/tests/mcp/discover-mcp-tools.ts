#!/usr/bin/env tsx
/**
 * Discover available tools from Workato MCP servers
 * 
 * This script queries the Workato MCP endpoints to see what tools they expose
 * and what the actual tool names are (to help with excludeTools configuration)
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';

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

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface MCPListToolsResponse {
  tools: MCPTool[];
}

/**
 * Query MCP server for available tools
 */
async function discoverTools(url: string, token: string, serverName: string): Promise<void> {
  console.log(`\n🔍 Discovering tools from ${serverName}`);
  console.log(`   URL: ${url}`);
  
  try {
    // MCP servers typically expose a tools endpoint or respond to a tools list request
    // Try the standard MCP protocol first
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
      return;
    }

    const data = await response.json();
    
    if (data.result && data.result.tools) {
      const tools = data.result.tools as MCPTool[];
      console.log(`   ✅ Found ${tools.length} tools:\n`);
      
      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`      ${tool.description.substring(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`   ⚠️  Unexpected response format`);
      console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 500)}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${(error as Error).message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🏨 Workato MCP Tool Discovery\n');
  console.log('=' .repeat(60));
  
  // Discover tools from guest server
  const guestUrl = env.MCP_GUEST_URL;
  const guestToken = env.MCP_GUEST_TOKEN;
  
  if (guestUrl && guestToken) {
    await discoverTools(guestUrl, guestToken, 'hotel-services');
  } else {
    console.log('\n⚠️  MCP_GUEST_URL or MCP_GUEST_TOKEN not configured');
  }
  
  // Discover tools from manager server
  const managerUrl = env.MCP_MANAGER_URL;
  const managerToken = env.MCP_MANAGER_TOKEN;
  
  if (managerUrl && managerToken) {
    await discoverTools(managerUrl, managerToken, 'hotel-operations');
  } else {
    console.log('\n⚠️  MCP_MANAGER_URL or MCP_MANAGER_TOKEN not configured');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Use these exact tool names in excludeTools configuration');
  console.log('   Example: "excludeTools": ["tool-name-1", "tool-name-2"]');
  console.log('\n');
}

main().catch(console.error);
