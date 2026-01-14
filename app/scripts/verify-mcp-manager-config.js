#!/usr/bin/env node

/**
 * Verify MCP Manager can load manager configuration
 */

const { MCPManager } = require('../lib/bedrock/mcp-manager.ts');

async function verifyManagerConfig() {
  console.log('Verifying MCP Manager can load manager configuration...\n');
  
  try {
    const mcpManager = new MCPManager({ debug: true });
    
    // Load manager configuration
    console.log('Loading manager configuration...');
    const config = await mcpManager.loadConfigForRole('manager');
    console.log('✓ Configuration loaded successfully\n');
    
    console.log('Configuration details:');
    console.log(`  Role: ${config.role}`);
    console.log(`  Servers: ${config.servers.length}`);
    
    for (const server of config.servers) {
      console.log(`\n  Server: ${server.name}`);
      console.log(`    Type: ${server.type}`);
      if (server.type === 'http') {
        console.log(`    URL: ${server.url}`);
        console.log(`    Auth: ${server.auth?.type || 'none'}`);
      }
      console.log(`    Tools: ${server.tools.join(', ')}`);
    }
    
    // Get tools for manager role
    console.log('\n\nGetting tools for manager role...');
    const tools = await mcpManager.getToolsForRole('manager');
    console.log(`✓ Found ${tools.length} tools\n`);
    
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }
    
    // Verify required tools are present
    const requiredTools = [
      'get_occupancy_stats',
      'get_revenue_report',
      'view_all_bookings',
      'assign_room'
    ];
    
    console.log('\n\nVerifying required tools...');
    const toolNames = tools.map(t => t.name);
    let allPresent = true;
    
    for (const requiredTool of requiredTools) {
      if (toolNames.includes(requiredTool)) {
        console.log(`  ✓ ${requiredTool}`);
      } else {
        console.log(`  ✗ ${requiredTool} - MISSING`);
        allPresent = false;
      }
    }
    
    if (allPresent) {
      console.log('\n✓ All required tools are configured!');
    } else {
      console.log('\n✗ Some required tools are missing!');
      process.exit(1);
    }
    
    // Shutdown
    await mcpManager.shutdown();
    
    console.log('\n✓ Manager MCP configuration is valid and ready!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyManagerConfig();
