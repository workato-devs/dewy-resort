#!/usr/bin/env node

/**
 * Discover Workato Recipes and API Collections
 * 
 * This script uses the Workato MCP server to discover existing recipes
 * and API collections to understand what endpoints are already available.
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

async function callMCPTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    log(`Calling MCP tool: ${toolName}`, 'cyan');
    if (Object.keys(args).length > 0) {
      log(`Arguments: ${JSON.stringify(args, null, 2)}`, 'blue');
    }

    // For now, we'll output instructions for manual testing
    // since we can't directly call MCP tools from Node.js
    log('\nTo call this tool manually, use the Kiro MCP interface or:', 'yellow');
    log(`Tool: ${toolName}`, 'yellow');
    if (Object.keys(args).length > 0) {
      log(`Args: ${JSON.stringify(args, null, 2)}`, 'yellow');
    }
    
    resolve({ manual: true, toolName, args });
  });
}

async function discoverAPICollections() {
  logSection('Step 1: Discover API Collections');
  
  log('Calling get_api_collections to list all available API collections...', 'green');
  await callMCPTool('get_api_collections');
  
  log('\nExpected output:', 'blue');
  log('- List of API collections with IDs and names', 'blue');
  log('- Look for "utilities-v1" or similar collection', 'blue');
  log('- Note the collection ID for further queries', 'blue');
}

async function discoverRecipes() {
  logSection('Step 2: Discover Recipes in Folder 7063');
  
  log('Calling get_recipes to list recipes in folder ID 7063...', 'green');
  await callMCPTool('get_recipes', { folder_id: 7063 });
  
  log('\nExpected output:', 'blue');
  log('- List of recipes with IDs, names, and descriptions', 'blue');
  log('- Look for recipes related to:', 'blue');
  log('  * Rooms (search, get, create, update)', 'blue');
  log('  * Maintenance tasks (search, get, create, update)', 'blue');
  log('  * Charges/billing (search, get, create, update)', 'blue');
  log('  * Service requests (search, create, update)', 'blue');
}

async function discoverAPIEndpoints() {
  logSection('Step 3: Discover API Endpoints in utilities-v1');
  
  log('Calling get_api_endpoints to list endpoints in utilities-v1 collection...', 'green');
  log('Note: You may need the collection ID from Step 1', 'yellow');
  await callMCPTool('get_api_endpoints', { collection_name: 'utilities-v1' });
  
  log('\nExpected output:', 'blue');
  log('- List of API endpoints with methods and paths', 'blue');
  log('- Check for existing endpoints:', 'blue');
  log('  * /search-rooms, /get-room/{id}, /create-room, /update-room/{id}', 'blue');
  log('  * /search-maintenance-tasks, /get-maintenance-task/{id}, etc.', 'blue');
  log('  * /search-charges, /get-charge/{id}, etc.', 'blue');
  log('  * /search-service-requests or /search-cases', 'blue');
}

async function main() {
  log('Workato Recipe Discovery Tool', 'bright');
  log('This tool helps discover existing Workato recipes and API collections\n', 'cyan');
  
  log('Prerequisites:', 'yellow');
  log('1. Workato MCP server must be configured in .kiro/settings/mcp.json', 'yellow');
  log('2. WORKATO_MCP_TOKEN environment variable must be set', 'yellow');
  log('3. MCP server must be running and connected\n', 'yellow');
  
  try {
    await discoverAPICollections();
    await discoverRecipes();
    await discoverAPIEndpoints();
    
    logSection('Summary');
    log('Discovery process outlined above.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Execute the MCP tool calls manually or via Kiro interface', 'cyan');
    log('2. Document the results in a discovery report', 'cyan');
    log('3. Compare discovered endpoints with required endpoints in SALESFORCE_NEEDS.md', 'cyan');
    log('4. Identify which recipes need to be created', 'cyan');
    
  } catch (error) {
    log(`\nError: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
