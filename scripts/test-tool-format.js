#!/usr/bin/env node

/**
 * Test Tool Format
 * Verifies that MCP tools are using the correct schema format for Bedrock
 */

const { MCPManager } = require('../lib/bedrock/mcp-manager.ts');

async function testToolFormat() {
  console.log('Testing MCP tool format...\n');
  
  const manager = new MCPManager({ debug: true });
  
  try {
    // Get tools for manager role
    const tools = await manager.getToolsForRole('manager');
    
    console.log(`Found ${tools.length} tools for manager role\n`);
    
    // Check each tool
    for (const tool of tools) {
      console.log(`Tool: ${tool.name}`);
      console.log(`  Description: ${tool.description}`);
      console.log(`  Has input_schema: ${!!tool.input_schema}`);
      console.log(`  Has inputSchema (wrong): ${!!(tool as any).inputSchema}`);
      
      if (tool.input_schema) {
        console.log(`  ✅ Correct format (input_schema)`);
      } else if ((tool as any).inputSchema) {
        console.log(`  ❌ Wrong format (inputSchema) - needs to be input_schema`);
      }
      console.log('');
    }
    
    // Show JSON format
    console.log('Tool JSON format:');
    console.log(JSON.stringify(tools[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await manager.shutdown();
  }
}

testToolFormat();
