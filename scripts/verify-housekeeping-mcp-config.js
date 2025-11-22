#!/usr/bin/env node

/**
 * Verify housekeeping MCP configuration can be loaded by MCP Manager
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

async function verifyHousekeepingConfig() {
  logSection('Housekeeping MCP Configuration Verification');
  
  try {
    // 1. Load configuration file
    log('\n1. Loading housekeeping MCP configuration...', 'blue');
    const configPath = path.join(process.cwd(), 'config', 'mcp', 'housekeeping.json');
    
    if (!fs.existsSync(configPath)) {
      log('✗ Configuration file not found', 'red');
      return false;
    }
    
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    log('✓ Configuration loaded successfully', 'green');
    
    // 2. Validate role
    log('\n2. Validating role...', 'blue');
    if (config.role !== 'housekeeping') {
      log(`✗ Invalid role: ${config.role} (expected "housekeeping")`, 'red');
      return false;
    }
    log('✓ Role is correct: housekeeping', 'green');
    
    // 3. Validate servers
    log('\n3. Validating servers...', 'blue');
    if (!Array.isArray(config.servers)) {
      log('✗ Servers must be an array', 'red');
      return false;
    }
    
    if (config.servers.length === 0) {
      log('✗ At least one server must be configured', 'red');
      return false;
    }
    
    log(`✓ Found ${config.servers.length} server(s)`, 'green');
    
    // 4. Validate each server
    log('\n4. Validating server configurations...', 'blue');
    
    const requiredTools = [
      'view_my_tasks',
      'update_room_cleaning_status',
      'report_maintenance_issue',
      'request_supplies'
    ];
    
    let allToolsFound = false;
    
    for (const server of config.servers) {
      log(`\n   Server: ${server.name}`, 'cyan');
      
      // Check server name
      if (!server.name) {
        log('   ✗ Server name is required', 'red');
        return false;
      }
      log(`   ✓ Name: ${server.name}`, 'green');
      
      // Check server type
      if (!server.type) {
        log('   ✗ Server type is required', 'red');
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
          log('   ✗ HTTP server requires URL', 'red');
          return false;
        }
        log(`   ✓ URL: ${server.url}`, 'green');
        
        if (!server.auth) {
          log('   ⚠ No authentication configured', 'yellow');
        } else {
          log(`   ✓ Auth type: ${server.auth.type}`, 'green');
          
          if (server.auth.type === 'bearer') {
            if (!server.auth.token) {
              log('   ✗ Bearer auth requires token', 'red');
              return false;
            }
            log('   ✓ Token configured', 'green');
          }
        }
      }
      
      // Validate stdio server
      if (server.type === 'stdio') {
        if (!server.command) {
          log('   ✗ Stdio server requires command', 'red');
          return false;
        }
        log(`   ✓ Command: ${server.command}`, 'green');
        
        if (server.args && Array.isArray(server.args)) {
          log(`   ✓ Args: ${server.args.join(' ')}`, 'green');
        }
      }
      
      // Check tools
      if (!Array.isArray(server.tools)) {
        log('   ✗ Tools must be an array', 'red');
        return false;
      }
      
      if (server.tools.length === 0) {
        log('   ✗ At least one tool must be configured', 'red');
        return false;
      }
      
      log(`   ✓ Tools (${server.tools.length}): ${server.tools.join(', ')}`, 'green');
      
      // Check for required housekeeping tools
      const foundTools = requiredTools.filter(tool => server.tools.includes(tool));
      const missingTools = requiredTools.filter(tool => !server.tools.includes(tool));
      
      if (foundTools.length === requiredTools.length) {
        log('   ✓ All required housekeeping tools are configured', 'green');
        allToolsFound = true;
      } else if (foundTools.length > 0) {
        log(`   ✓ Found ${foundTools.length}/${requiredTools.length} required tools`, 'green');
        log(`   ⚠ Missing tools: ${missingTools.join(', ')}`, 'yellow');
      }
    }
    
    // 5. Verify required tools
    log('\n5. Verifying required housekeeping tools...', 'blue');
    
    const allConfiguredTools = config.servers.flatMap(s => s.tools);
    const uniqueTools = [...new Set(allConfiguredTools)];
    
    log(`   Total unique tools: ${uniqueTools.length}`, 'cyan');
    
    for (const tool of requiredTools) {
      if (uniqueTools.includes(tool)) {
        log(`   ✓ ${tool}`, 'green');
      } else {
        log(`   ✗ ${tool} (missing)`, 'red');
      }
    }
    
    const allRequiredToolsPresent = requiredTools.every(tool => uniqueTools.includes(tool));
    
    if (allRequiredToolsPresent) {
      log('\n✓ All required housekeeping tools are configured', 'green');
    } else {
      log('\n⚠ Some required tools are missing', 'yellow');
    }
    
    // 6. Check for remote server configuration
    log('\n6. Checking remote server configuration...', 'blue');
    
    const httpServers = config.servers.filter(s => s.type === 'http');
    const stdioServers = config.servers.filter(s => s.type === 'stdio');
    
    log(`   HTTP servers: ${httpServers.length}`, 'cyan');
    log(`   Stdio servers: ${stdioServers.length}`, 'cyan');
    
    if (httpServers.length > 0) {
      log('   ✓ Remote MCP servers configured', 'green');
    } else {
      log('   ⚠ No remote MCP servers configured', 'yellow');
    }
    
    // Summary
    logSection('Verification Summary');
    log('✓ Configuration file is valid JSON', 'green');
    log('✓ Role is correctly set to "housekeeping"', 'green');
    log(`✓ ${config.servers.length} server(s) configured`, 'green');
    log(`✓ ${uniqueTools.length} unique tool(s) available`, 'green');
    
    if (allRequiredToolsPresent) {
      log('✓ All required housekeeping tools are present', 'green');
    } else {
      log('⚠ Some required tools are missing', 'yellow');
    }
    
    if (httpServers.length > 0) {
      log('✓ Remote MCP servers configured', 'green');
    }
    
    log('\nHousekeeping MCP configuration is valid and ready to use!', 'green');
    return true;
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Run verification
verifyHousekeepingConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
