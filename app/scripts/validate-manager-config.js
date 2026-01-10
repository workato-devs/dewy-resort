#!/usr/bin/env node

/**
 * Validate manager MCP configuration against schema
 */

const fs = require('fs');
const path = require('path');

// Simple schema validation (mimics the TypeScript validator)
function validateMCPConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Config must be an object' };
  }

  if (!['guest', 'manager', 'housekeeping', 'maintenance'].includes(config.role)) {
    return { valid: false, error: `Invalid role: ${config.role}` };
  }

  if (!Array.isArray(config.servers)) {
    return { valid: false, error: 'Servers must be an array' };
  }

  for (const server of config.servers) {
    if (!server.name || typeof server.name !== 'string') {
      return { valid: false, error: 'Server must have a name' };
    }
    
    if (!server.type || !['http', 'stdio'].includes(server.type)) {
      return { valid: false, error: `Invalid server type: ${server.type}` };
    }
    
    if (server.type === 'http') {
      if (!server.url || typeof server.url !== 'string') {
        return { valid: false, error: `HTTP server ${server.name} missing URL` };
      }
      if (server.auth) {
        if (!['bearer', 'basic', 'none'].includes(server.auth.type)) {
          return { valid: false, error: `Invalid auth type: ${server.auth.type}` };
        }
      }
    }
    
    if (server.type === 'stdio') {
      if (!server.command || typeof server.command !== 'string') {
        return { valid: false, error: `Stdio server ${server.name} missing command` };
      }
    }
    
    if (!Array.isArray(server.tools)) {
      return { valid: false, error: `Server ${server.name} tools must be an array` };
    }
    
    if (server.tools.length === 0) {
      return { valid: false, error: `Server ${server.name} must have at least one tool` };
    }
  }

  return { valid: true };
}

console.log('Validating manager MCP configuration...\n');

try {
  // Load configuration
  const configPath = path.join(process.cwd(), 'config', 'mcp', 'manager.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  
  console.log('✓ Configuration file loaded');
  console.log('✓ Valid JSON syntax');
  
  // Validate against schema
  const validation = validateMCPConfig(config);
  
  if (!validation.valid) {
    console.error('\n✗ Schema validation failed:', validation.error);
    process.exit(1);
  }
  
  console.log('✓ Schema validation passed');
  
  // Verify required tools
  const requiredTools = [
    'get_occupancy_stats',
    'get_revenue_report',
    'view_all_bookings',
    'assign_room'
  ];
  
  const allTools = config.servers.flatMap(s => s.tools);
  const missingTools = requiredTools.filter(tool => !allTools.includes(tool));
  
  if (missingTools.length > 0) {
    console.error('\n✗ Missing required tools:', missingTools.join(', '));
    process.exit(1);
  }
  
  console.log('✓ All required tools present');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Configuration Summary');
  console.log('='.repeat(60));
  console.log(`Role: ${config.role}`);
  console.log(`Servers: ${config.servers.length}`);
  
  for (const server of config.servers) {
    console.log(`\n  ${server.name} (${server.type})`);
    if (server.type === 'http') {
      console.log(`    URL: ${server.url}`);
      console.log(`    Auth: ${server.auth?.type || 'none'}`);
    }
    console.log(`    Tools (${server.tools.length}):`);
    server.tools.forEach(tool => {
      console.log(`      - ${tool}`);
    });
  }
  
  console.log('\n✓ Manager MCP configuration is valid!\n');
  process.exit(0);
  
} catch (error) {
  console.error('\n✗ Error:', error.message);
  process.exit(1);
}
