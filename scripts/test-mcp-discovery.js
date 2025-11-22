#!/usr/bin/env node

/**
 * Test MCP Tool Discovery
 * 
 * This script tests the MCP Manager's ability to discover tools from configured servers.
 * Run with: node scripts/test-mcp-discovery.js [role]
 */

const { MCPManager } = require('../lib/bedrock/mcp-manager');

async function testMCPDiscovery(role = 'manager') {
  console.log(`\n🔍 Testing MCP Tool Discovery for role: ${role}\n`);
  
  try {
    // Create MCP manager with debug enabled
    const mcpManager = new MCPManager({ debug: true });
    
    console.log('📋 Loading MCP configuration...');
    const config = await mcpManager.loadConfigForRole(role);
    
    console.log(`\n✅ Configuration loaded for role: ${config.role}`);
    console.log(`   Servers configured: ${config.servers.length}\n`);
    
    for (const server of config.servers) {
      console.log(`📡 Server: ${server.name}`);
      console.log(`   Type: ${server.type}`);
      console.log(`   URL: ${server.url || 'N/A'}`);
      console.log(`   Auth: ${server.auth ? server.auth.type : 'none'}`);
      console.log(`   Tools filter: ${server.tools && server.tools.length > 0 ? server.tools.join(', ') : 'all (no filter)'}`);
      console.log('');
    }
    
    console.log('🔧 Discovering tools...\n');
    const tools = await mcpManager.getToolsForRole(role);
    
    if (tools.length === 0) {
      console.log('⚠️  No tools discovered!');
      console.log('\nPossible issues:');
      console.log('  1. MCP server is not responding');
      console.log('  2. Authentication failed');
      console.log('  3. Server returned empty tool list');
      console.log('  4. Network connectivity issues');
      console.log('\nCheck the debug logs above for more details.');
    } else {
      console.log(`✅ Discovered ${tools.length} tools:\n`);
      
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        console.log(`   Description: ${tool.description.substring(0, 100)}...`);
        const params = Object.keys(tool.input_schema?.properties || {});
        console.log(`   Parameters (${params.length}): ${params.join(', ')}`);
        console.log('');
      });
    }
    
    // Cleanup
    await mcpManager.shutdown();
    
  } catch (error) {
    console.error('\n❌ Error testing MCP discovery:');
    console.error(error);
    process.exit(1);
  }
}

// Get role from command line or use default
const role = process.argv[2] || 'manager';
testMCPDiscovery(role);
