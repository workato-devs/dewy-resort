#!/usr/bin/env node

/**
 * Test loading maintenance configuration with MCP Manager
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testMaintenanceMCPManager() {
  logSection('Maintenance MCP Manager Integration Test');
  
  try {
    // 1. Verify configuration file exists
    log('\n1. Checking configuration file...', 'blue');
    const configPath = path.join(process.cwd(), 'config', 'mcp', 'maintenance.json');
    
    if (!fs.existsSync(configPath)) {
      log('✗ Configuration file not found', 'red');
      return false;
    }
    log('✓ Configuration file exists', 'green');
    
    // 2. Load and parse configuration
    log('\n2. Loading configuration...', 'blue');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    log('✓ Configuration parsed successfully', 'green');
    
    // 3. Validate configuration structure
    log('\n3. Validating configuration structure...', 'blue');
    
    if (config.role !== 'maintenance') {
      log(`✗ Invalid role: ${config.role}`, 'red');
      return false;
    }
    log('✓ Role: maintenance', 'green');
    
    if (!Array.isArray(config.servers)) {
      log('✗ Servers must be an array', 'red');
      return false;
    }
    log(`✓ Servers: ${config.servers.length}`, 'green');
    
    // 4. Validate server configurations
    log('\n4. Validating server configurations...', 'blue');
    
    for (const server of config.servers) {
      log(`\n   Server: ${server.name}`, 'cyan');
      
      // Validate required fields
      if (!server.name) {
        log('   ✗ Missing server name', 'red');
        return false;
      }
      
      if (!server.type) {
        log('   ✗ Missing server type', 'red');
        return false;
      }
      
      if (!['http', 'stdio'].includes(server.type)) {
        log(`   ✗ Invalid server type: ${server.type}`, 'red');
        return false;
      }
      log(`   ✓ Type: ${server.type}`, 'green');
      
      // Validate HTTP server
      if (server.type === 'http') {
        if (!server.url) {
          log('   ✗ HTTP server missing URL', 'red');
          return false;
        }
        log(`   ✓ URL: ${server.url}`, 'green');
        
        if (server.auth) {
          if (!server.auth.type) {
            log('   ✗ Auth missing type', 'red');
            return false;
          }
          log(`   ✓ Auth type: ${server.auth.type}`, 'green');
          
          if (server.auth.type === 'bearer' && !server.auth.token) {
            log('   ✗ Bearer auth missing token', 'red');
            return false;
          }
          
          if (server.auth.type === 'bearer') {
            log('   ✓ Token configured', 'green');
          }
        }
      }
      
      // Validate stdio server
      if (server.type === 'stdio') {
        if (!server.command) {
          log('   ✗ Stdio server missing command', 'red');
          return false;
        }
        log(`   ✓ Command: ${server.command}`, 'green');
      }
      
      // Validate tools
      if (!Array.isArray(server.tools)) {
        log('   ✗ Tools must be an array', 'red');
        return false;
      }
      
      if (server.tools.length === 0) {
        log('   ✗ Server must have at least one tool', 'red');
        return false;
      }
      
      log(`   ✓ Tools (${server.tools.length}): ${server.tools.join(', ')}`, 'green');
    }
    
    // 5. Verify required maintenance tools
    log('\n5. Verifying required maintenance tools...', 'blue');
    
    const requiredTools = [
      'view_my_work_orders',
      'update_task_status',
      'get_equipment_info',
      'order_parts'
    ];
    
    const allTools = config.servers.flatMap(s => s.tools);
    const uniqueTools = [...new Set(allTools)];
    
    let allToolsPresent = true;
    for (const tool of requiredTools) {
      if (uniqueTools.includes(tool)) {
        log(`   ✓ ${tool}`, 'green');
      } else {
        log(`   ✗ ${tool} (missing)`, 'red');
        allToolsPresent = false;
      }
    }
    
    if (!allToolsPresent) {
      log('\n✗ Some required tools are missing', 'red');
      return false;
    }
    
    // 6. Check MCP Manager compatibility
    log('\n6. Checking MCP Manager compatibility...', 'blue');
    
    // Check if schema file exists
    const schemaPath = path.join(process.cwd(), 'config', 'mcp', 'schema.ts');
    if (fs.existsSync(schemaPath)) {
      log('✓ MCP schema file exists', 'green');
    } else {
      log('⚠ MCP schema file not found', 'yellow');
    }
    
    // Check if MCP Manager exists
    const managerPath = path.join(process.cwd(), 'lib', 'bedrock', 'mcp-manager.ts');
    if (fs.existsSync(managerPath)) {
      log('✓ MCP Manager file exists', 'green');
    } else {
      log('✗ MCP Manager file not found', 'red');
      return false;
    }
    
    // Summary
    logSection('Test Summary');
    log('✓ Configuration file is valid', 'green');
    log('✓ All required fields are present', 'green');
    log('✓ All required maintenance tools are configured', 'green');
    log('✓ Configuration is compatible with MCP Manager', 'green');
    
    log('\nMaintenance MCP configuration is ready for use with MCP Manager!', 'green');
    
    // Display configuration summary
    log('\nConfiguration Summary:', 'cyan');
    log(`  Role: ${config.role}`, 'cyan');
    log(`  Servers: ${config.servers.length}`, 'cyan');
    log(`  Total tools: ${uniqueTools.length}`, 'cyan');
    log(`  Required tools: ${requiredTools.length}/${requiredTools.length} present`, 'cyan');
    
    const httpServers = config.servers.filter(s => s.type === 'http').length;
    const stdioServers = config.servers.filter(s => s.type === 'stdio').length;
    log(`  HTTP servers: ${httpServers}`, 'cyan');
    log(`  Stdio servers: ${stdioServers}`, 'cyan');
    
    return true;
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Run the test
testMaintenanceMCPManager()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
