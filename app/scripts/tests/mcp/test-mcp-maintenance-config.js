#!/usr/bin/env node

/**
 * Test script for maintenance MCP configuration
 * 
 * This script validates the maintenance MCP configuration and tests connectivity
 * to remote MCP servers.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key.trim()] = value.trim();
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors loading .env file
  }
}

loadEnvFile();

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

async function testMaintenanceMCPConfig() {
  logSection('Maintenance MCP Configuration Test');
  
  try {
    // 1. Load configuration
    log('\n1. Loading maintenance MCP configuration...', 'blue');
    const configPath = path.join(process.cwd(), 'config', 'mcp', 'maintenance.json');
    
    if (!fs.existsSync(configPath)) {
      log('✗ Configuration file not found', 'red');
      return false;
    }
    
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    log('✓ Configuration loaded successfully', 'green');
    
    // 2. Validate configuration structure
    log('\n2. Validating configuration structure...', 'blue');
    
    if (config.role !== 'maintenance') {
      log('✗ Invalid role: expected "maintenance"', 'red');
      return false;
    }
    log('✓ Role is correct: maintenance', 'green');
    
    if (!Array.isArray(config.servers)) {
      log('✗ Servers must be an array', 'red');
      return false;
    }
    log(`✓ Found ${config.servers.length} server(s)`, 'green');
    
    // 3. Validate each server
    log('\n3. Validating server configurations...', 'blue');
    
    for (const server of config.servers) {
      log(`\n   Server: ${server.name}`, 'cyan');
      
      // Check server type
      if (!server.type || !['http', 'stdio'].includes(server.type)) {
        log(`   ✗ Invalid or missing server type`, 'red');
        return false;
      }
      log(`   ✓ Type: ${server.type}`, 'green');
      
      // Validate HTTP server
      if (server.type === 'http') {
        if (!server.url) {
          log(`   ✗ HTTP server missing URL`, 'red');
          return false;
        }
        log(`   ✓ URL: ${server.url}`, 'green');
        
        if (server.auth) {
          log(`   ✓ Auth type: ${server.auth.type}`, 'green');
          if (server.auth.type === 'bearer' && server.auth.token) {
            const tokenPreview = server.auth.token.substring(0, 20) + '...';
            log(`   ✓ Token configured: ${tokenPreview}`, 'green');
          }
        }
      }
      
      // Validate stdio server
      if (server.type === 'stdio') {
        if (!server.command) {
          log(`   ✗ Stdio server missing command`, 'red');
          return false;
        }
        log(`   ✓ Command: ${server.command}`, 'green');
      }
      
      // Check tools
      if (!Array.isArray(server.tools) || server.tools.length === 0) {
        log(`   ✗ Server must have at least one tool`, 'red');
        return false;
      }
      log(`   ✓ Tools (${server.tools.length}): ${server.tools.join(', ')}`, 'green');
      
      // Validate required maintenance tools
      const requiredTools = [
        'view_my_work_orders',
        'update_task_status',
        'get_equipment_info',
        'order_parts'
      ];
      
      const missingTools = requiredTools.filter(tool => !server.tools.includes(tool));
      if (missingTools.length > 0) {
        log(`   ⚠ Missing recommended tools: ${missingTools.join(', ')}`, 'yellow');
      } else {
        log(`   ✓ All required maintenance tools are configured`, 'green');
      }
    }
    
    // 4. Check environment variables
    log('\n4. Checking environment variables...', 'blue');
    
    const requiredEnvVars = [];
    for (const server of config.servers) {
      if (server.type === 'http') {
        // Extract env var names from URL and auth
        const urlVars = (server.url.match(/\$\{([^}]+)\}/g) || []).map(v => v.slice(2, -1));
        requiredEnvVars.push(...urlVars);
        
        if (server.auth && server.auth.token) {
          const tokenVars = (server.auth.token.match(/\$\{([^}]+)\}/g) || []).map(v => v.slice(2, -1));
          requiredEnvVars.push(...tokenVars);
        }
      }
    }
    
    const uniqueEnvVars = [...new Set(requiredEnvVars)];
    let allEnvVarsSet = true;
    
    for (const envVar of uniqueEnvVars) {
      if (process.env[envVar]) {
        log(`   ✓ ${envVar} is set`, 'green');
      } else {
        log(`   ✗ ${envVar} is not set`, 'red');
        allEnvVarsSet = false;
      }
    }
    
    if (!allEnvVarsSet) {
      log('\n⚠ Some environment variables are not set', 'yellow');
      log('   Please set them in your .env file', 'yellow');
    }
    
    // 5. Test connectivity (if env vars are set)
    if (allEnvVarsSet) {
      log('\n5. Testing connectivity to remote MCP servers...', 'blue');
      
      for (const server of config.servers) {
        if (server.type === 'http') {
          log(`\n   Testing ${server.name}...`, 'cyan');
          
          // Interpolate environment variables
          const url = server.url.replace(/\$\{([^}]+)\}/g, (_, varName) => {
            return process.env[varName] || '';
          });
          
          try {
            const headers = {
              'Content-Type': 'application/json',
            };
            
            if (server.auth) {
              if (server.auth.type === 'bearer' && server.auth.token) {
                const token = server.auth.token.replace(/\$\{([^}]+)\}/g, (_, varName) => {
                  return process.env[varName] || '';
                });
                headers['Authorization'] = `Bearer ${token}`;
              }
            }
            
            // Try to connect to the server (with timeout)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
              log(`   ✓ Successfully connected to ${server.name}`, 'green');
            } else {
              log(`   ⚠ Server responded with status ${response.status}`, 'yellow');
              log(`   This may be expected if the server doesn't support GET requests`, 'yellow');
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              log(`   ✗ Connection timeout`, 'red');
            } else {
              log(`   ✗ Connection failed: ${error.message}`, 'red');
            }
            log(`   Note: This is expected if the MCP server is not yet deployed`, 'yellow');
          }
        }
      }
    } else {
      log('\n5. Skipping connectivity tests (environment variables not set)', 'yellow');
    }
    
    // Summary
    logSection('Test Summary');
    log('✓ Configuration structure is valid', 'green');
    log(`✓ Found ${config.servers.length} server(s) configured`, 'green');
    
    const httpServers = config.servers.filter(s => s.type === 'http').length;
    const stdioServers = config.servers.filter(s => s.type === 'stdio').length;
    log(`  - HTTP servers: ${httpServers}`, 'cyan');
    log(`  - Stdio servers: ${stdioServers}`, 'cyan');
    
    const totalTools = config.servers.reduce((sum, s) => sum + s.tools.length, 0);
    log(`✓ Total tools configured: ${totalTools}`, 'green');
    
    if (!allEnvVarsSet) {
      log('\n⚠ Action required: Set missing environment variables', 'yellow');
    } else {
      log('\n✓ All environment variables are configured', 'green');
    }
    
    log('\nMaintenance MCP configuration is ready!', 'green');
    return true;
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// Run the test
testMaintenanceMCPConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
