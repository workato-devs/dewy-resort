/**
 * Validation script for MCP configurations
 * 
 * Usage: npx tsx config/mcp/validate.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { validateMCPConfig, MCPRoleConfig } from './schema';

const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];

console.log('Validating MCP configurations...\n');

let allValid = true;

for (const role of roles) {
  const configPath = join(__dirname, `${role}.json`);
  
  try {
    const configContent = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    if (validateMCPConfig(config)) {
      console.log(`✓ ${role}.json: Valid`);
      
      // Additional validation
      if (config.role !== role) {
        console.log(`  ⚠ Warning: Role mismatch (expected "${role}", got "${config.role}")`);
      }
      
      console.log(`  - ${config.servers.length} server(s) configured`);
      for (const server of config.servers) {
        console.log(`    • ${server.name}: ${server.tools?.length || 0} tool(s)`);
      }
    } else {
      console.log(`✗ ${role}.json: Invalid configuration`);
      allValid = false;
    }
  } catch (error) {
    console.log(`✗ ${role}.json: Error reading or parsing file`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    allValid = false;
  }
  
  console.log('');
}

if (allValid) {
  console.log('All MCP configurations are valid! ✓');
  process.exit(0);
} else {
  console.log('Some MCP configurations are invalid. ✗');
  process.exit(1);
}
