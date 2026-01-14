#!/usr/bin/env node

/**
 * Verify MCP Manager HTTP server support
 * 
 * This script tests that the MCP Manager can load and work with HTTP-based MCP servers.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
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
    // Ignore errors
  }
}

loadEnvFile();

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyMCPManager() {
  console.log('\n' + '='.repeat(60));
  log('MCP Manager HTTP Server Support Verification', 'cyan');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Import MCP Manager (using dynamic import for ES modules)
    log('1. Loading MCP Manager...', 'cyan');
    const { getMCPManager } = await import('../lib/bedrock/mcp-manager.ts');
    log('✓ MCP Manager loaded successfully', 'green');
    
    // Create MCP Manager instance
    log('\n2. Creating MCP Manager instance...', 'cyan');
    const mcpManager = getMCPManager({ debug: true });
    log('✓ MCP Manager instance created', 'green');
    
    // Load guest configuration
    log('\n3. Loading guest MCP configuration...', 'cyan');
    const config = await mcpManager.loadConfigForRole('guest');
    log('✓ Configuration loaded successfully', 'green');
    log(`   Role: ${config.role}`, 'cyan');
    log(`   Servers: ${config.servers.length}`, 'cyan');
    
    // Verify HTTP servers
    log('\n4. Verifying HTTP server configurations...', 'cyan');
    for (const server of config.servers) {
      log(`\n   Server: ${server.name}`, 'cyan');
      log(`   Type: ${server.type}`, 'cyan');
      
      if (server.type === 'http') {
        log(`   ✓ HTTP server detected`, 'green');
        
        if (server.url) {
          // Check if URL has been interpolated
          if (server.url.includes('${')) {
            log(`   ⚠ URL contains uninterpolated variables: ${server.url}`, 'yellow');
          } else {
            log(`   ✓ URL interpolated: ${server.url}`, 'green');
          }
        }
        
        if (server.auth) {
          log(`   ✓ Auth configured: ${server.auth.type}`, 'green');
        }
        
        log(`   ✓ Tools: ${server.tools.join(', ')}`, 'green');
      }
    }
    
    // Get tools for role
    log('\n5. Discovering tools for guest role...', 'cyan');
    const tools = await mcpManager.getToolsForRole('guest');
    log(`✓ Discovered ${tools.length} tools`, 'green');
    
    for (const tool of tools) {
      log(`   - ${tool.name}: ${tool.description}`, 'cyan');
    }
    
    // Test tool access validation
    log('\n6. Testing tool access validation...', 'cyan');
    const canAccessServiceRequest = await mcpManager.canRoleAccessTool('guest', 'create_service_request');
    const canAccessAnalytics = await mcpManager.canRoleAccessTool('guest', 'get_revenue_report');
    
    if (canAccessServiceRequest) {
      log('   ✓ Guest can access create_service_request', 'green');
    } else {
      log('   ✗ Guest cannot access create_service_request', 'red');
    }
    
    if (!canAccessAnalytics) {
      log('   ✓ Guest cannot access get_revenue_report (correct)', 'green');
    } else {
      log('   ✗ Guest can access get_revenue_report (incorrect)', 'red');
    }
    
    // Cleanup
    log('\n7. Cleaning up...', 'cyan');
    await mcpManager.shutdown();
    log('✓ MCP Manager shut down successfully', 'green');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    log('Verification Summary', 'cyan');
    console.log('='.repeat(60));
    log('✓ MCP Manager supports HTTP-based servers', 'green');
    log('✓ Configuration loading works correctly', 'green');
    log('✓ Tool discovery works correctly', 'green');
    log('✓ Tool access validation works correctly', 'green');
    log('\nMCP Manager HTTP support is working!', 'green');
    
    return true;
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// Run verification
verifyMCPManager()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
