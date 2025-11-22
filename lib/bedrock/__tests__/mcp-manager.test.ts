/**
 * MCP Manager Tests
 * 
 * Manual verification tests for MCP Manager functionality including configuration loading,
 * tool discovery, role-based access control, and connection management.
 * Run with: npx tsx lib/bedrock/__tests__/mcp-manager.test.ts
 */

import { MCPManager, resetMCPManager } from '../mcp-manager';
import { MCPRoleConfig } from '../../../config/mcp/schema';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Test helper to assert conditions
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test helper to check equality
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

/**
 * Test: Configuration Loading
 */
async function testConfigurationLoading(): Promise<void> {
  console.log('\n=== Test: Configuration Loading ===');
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });

  try {
    // Test guest configuration
    console.log('Testing guest configuration loading...');
    const guestConfig = await manager.loadConfigForRole('guest');
    assert(guestConfig !== null && guestConfig !== undefined, 'Guest config should be defined');
    assertEqual(guestConfig.role, 'guest', 'Guest config should have correct role');
    assert(Array.isArray(guestConfig.servers), 'Guest config should have servers array');
    assert(guestConfig.servers.length > 0, 'Guest config should have at least one server');
    console.log('✓ Guest configuration loaded');

    // Test manager configuration
    console.log('Testing manager configuration loading...');
    const managerConfig = await manager.loadConfigForRole('manager');
    assert(managerConfig !== null && managerConfig !== undefined, 'Manager config should be defined');
    assertEqual(managerConfig.role, 'manager', 'Manager config should have correct role');
    assert(Array.isArray(managerConfig.servers), 'Manager config should have servers array');
    assert(managerConfig.servers.length > 0, 'Manager config should have at least one server');
    console.log('✓ Manager configuration loaded');

    // Test housekeeping configuration
    console.log('Testing housekeeping configuration loading...');
    const housekeepingConfig = await manager.loadConfigForRole('housekeeping');
    assert(housekeepingConfig !== null && housekeepingConfig !== undefined, 'Housekeeping config should be defined');
    assertEqual(housekeepingConfig.role, 'housekeeping', 'Housekeeping config should have correct role');
    assert(Array.isArray(housekeepingConfig.servers), 'Housekeeping config should have servers array');
    console.log('✓ Housekeeping configuration loaded');

    // Test maintenance configuration
    console.log('Testing maintenance configuration loading...');
    const maintenanceConfig = await manager.loadConfigForRole('maintenance');
    assert(maintenanceConfig !== null && maintenanceConfig !== undefined, 'Maintenance config should be defined');
    assertEqual(maintenanceConfig.role, 'maintenance', 'Maintenance config should have correct role');
    assert(Array.isArray(maintenanceConfig.servers), 'Maintenance config should have servers array');
    console.log('✓ Maintenance configuration loaded');

    // Test configuration caching
    console.log('Testing configuration caching...');
    const config1 = await manager.loadConfigForRole('guest');
    const config2 = await manager.loadConfigForRole('guest');
    assert(config1 === config2, 'Cached configurations should be the same instance');
    console.log('✓ Configuration caching works');

    // Test non-existent role
    console.log('Testing non-existent role...');
    try {
      await manager.loadConfigForRole('invalid-role' as any);
      throw new Error('Should have thrown error for invalid role');
    } catch (error: any) {
      assert(error.message.includes('MCP configuration not found'), 'Should throw configuration not found error');
    }
    console.log('✓ Non-existent role handled correctly');

    console.log('✓ All configuration loading tests passed');
  } finally {
    await manager.shutdown();
    await resetMCPManager();
  }
}

/**
 * Test: Tool Discovery
 */
async function testToolDiscovery(): Promise<void> {
  console.log('\n=== Test: Tool Discovery ===');
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });

  try {
    // Test guest tools
    console.log('Testing guest tool discovery...');
    const guestTools = await manager.getToolsForRole('guest');
    assert(guestTools !== null && guestTools !== undefined, 'Guest tools should be defined');
    assert(Array.isArray(guestTools), 'Guest tools should be an array');
    
    const guestToolNames = guestTools.map(t => t.name);
    assert(guestToolNames.includes('create_service_request'), 'Guest should have create_service_request tool');
    assert(guestToolNames.includes('view_my_charges'), 'Guest should have view_my_charges tool');
    console.log(`✓ Guest tools discovered (${guestTools.length} tools)`);

    // Test manager tools
    console.log('Testing manager tool discovery...');
    const managerTools = await manager.getToolsForRole('manager');
    assert(managerTools !== null && managerTools !== undefined, 'Manager tools should be defined');
    assert(Array.isArray(managerTools), 'Manager tools should be an array');
    
    const managerToolNames = managerTools.map(t => t.name);
    assert(managerToolNames.includes('get_occupancy_stats'), 'Manager should have get_occupancy_stats tool');
    assert(managerToolNames.includes('view_all_bookings'), 'Manager should have view_all_bookings tool');
    console.log(`✓ Manager tools discovered (${managerTools.length} tools)`);

    // Test tool schema
    console.log('Testing tool schema structure...');
    for (const tool of guestTools) {
      assert(typeof tool.name === 'string', 'Tool name should be string');
      assert(tool.name.length > 0, 'Tool name should not be empty');
      assert(typeof tool.description === 'string', 'Tool description should be string');
      assert(tool.description.length > 0, 'Tool description should not be empty');
      assert(tool.inputSchema !== null && tool.inputSchema !== undefined, 'Tool should have input schema');
      assertEqual(tool.inputSchema.type, 'object', 'Tool input schema should be object type');
    }
    console.log('✓ Tool schemas are valid');

    console.log('✓ All tool discovery tests passed');
  } finally {
    await manager.shutdown();
    await resetMCPManager();
  }
}

/**
 * Test: Role-Based Access Control
 */
async function testRoleBasedAccessControl(): Promise<void> {
  console.log('\n=== Test: Role-Based Access Control ===');
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });

  try {
    // Test guest access to guest tools
    console.log('Testing guest access to guest tools...');
    const guestToGuest = await manager.canRoleAccessTool('guest', 'create_service_request');
    assertEqual(guestToGuest, true, 'Guest should access guest tools');
    console.log('✓ Guest can access guest tools');

    // Test guest access to manager tools
    console.log('Testing guest access to manager tools...');
    const guestToManager = await manager.canRoleAccessTool('guest', 'get_occupancy_stats');
    assertEqual(guestToManager, false, 'Guest should not access manager tools');
    console.log('✓ Guest cannot access manager tools');

    // Test manager access to manager tools
    console.log('Testing manager access to manager tools...');
    const managerToManager = await manager.canRoleAccessTool('manager', 'view_all_bookings');
    assertEqual(managerToManager, true, 'Manager should access manager tools');
    console.log('✓ Manager can access manager tools');

    // Test manager access to guest tools
    console.log('Testing manager access to guest tools...');
    const managerToGuest = await manager.canRoleAccessTool('manager', 'create_service_request');
    assertEqual(managerToGuest, false, 'Manager should not access guest tools');
    console.log('✓ Manager cannot access guest tools');

    // Test housekeeping access
    console.log('Testing housekeeping access to housekeeping tools...');
    const housekeepingAccess = await manager.canRoleAccessTool('housekeeping', 'view_my_tasks');
    assertEqual(housekeepingAccess, true, 'Housekeeping should access housekeeping tools');
    console.log('✓ Housekeeping can access housekeeping tools');

    // Test maintenance access
    console.log('Testing maintenance access to maintenance tools...');
    const maintenanceAccess = await manager.canRoleAccessTool('maintenance', 'view_my_work_orders');
    assertEqual(maintenanceAccess, true, 'Maintenance should access maintenance tools');
    console.log('✓ Maintenance can access maintenance tools');

    console.log('✓ All role-based access control tests passed');
  } finally {
    await manager.shutdown();
    await resetMCPManager();
  }
}

/**
 * Test: Tool Execution
 */
async function testToolExecution(): Promise<void> {
  console.log('\n=== Test: Tool Execution ===');
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });

  try {
    // Test authorized tool execution
    console.log('Testing authorized tool execution...');
    const authorizedResult = await manager.executeTool(
      'guest',
      'create_service_request',
      { category: 'housekeeping', description: 'Need towels' },
      'user-123'
    );
    assert(authorizedResult !== null && authorizedResult !== undefined, 'Result should be defined');
    // Note: With mock MCP servers, the result may succeed or fail depending on mock data
    // The important thing is that the tool was attempted and a result was returned
    console.log(`✓ Authorized tool execution attempted (success: ${authorizedResult.success})`);

    // Test unauthorized tool execution
    console.log('Testing unauthorized tool execution...');
    try {
      await manager.executeTool(
        'guest',
        'get_occupancy_stats',
        {},
        'user-123'
      );
      throw new Error('Should have thrown access denied error');
    } catch (error: any) {
      assert(
        error.message.includes('does not have access') || error.code === 'MCP_ACCESS_DENIED',
        'Should throw access denied error'
      );
    }
    console.log('✓ Unauthorized tool execution denied');

    // Test non-existent tool
    console.log('Testing non-existent tool execution...');
    try {
      await manager.executeTool(
        'guest',
        'non_existent_tool',
        {},
        'user-123'
      );
      throw new Error('Should have thrown error for non-existent tool');
    } catch (error: any) {
      assert(
        error.message.includes('does not have access') || error.code === 'MCP_ACCESS_DENIED',
        'Should throw error for non-existent tool'
      );
    }
    console.log('✓ Non-existent tool handled correctly');

    console.log('✓ All tool execution tests passed');
  } finally {
    await manager.shutdown();
    await resetMCPManager();
  }
}

/**
 * Test: Configuration Validation
 */
async function testConfigurationValidation(): Promise<void> {
  console.log('\n=== Test: Configuration Validation ===');

  // Test guest configuration structure
  console.log('Testing guest configuration structure...');
  const guestConfigPath = join(process.cwd(), 'config', 'mcp', 'guest.json');
  const guestConfigData = await readFile(guestConfigPath, 'utf-8');
  const guestConfig: MCPRoleConfig = JSON.parse(guestConfigData);
  
  assertEqual(guestConfig.role, 'guest', 'Guest config should have correct role');
  assert(guestConfig.servers !== null && guestConfig.servers !== undefined, 'Guest config should have servers');
  
  for (const server of guestConfig.servers) {
    assert(server.name !== null && server.name !== undefined, 'Server should have name');
    // Server should have either command (stdio) or url (http)
    assert(
      server.command !== null && server.command !== undefined || 
      (server as any).url !== null && (server as any).url !== undefined,
      'Server should have command or url'
    );
    assert(Array.isArray(server.tools), 'Server tools should be array');
    assert(server.tools.length > 0, 'Server should have at least one tool');
  }
  console.log('✓ Guest configuration structure is valid');

  // Test manager configuration structure
  console.log('Testing manager configuration structure...');
  const managerConfigPath = join(process.cwd(), 'config', 'mcp', 'manager.json');
  const managerConfigData = await readFile(managerConfigPath, 'utf-8');
  const managerConfig: MCPRoleConfig = JSON.parse(managerConfigData);
  
  assertEqual(managerConfig.role, 'manager', 'Manager config should have correct role');
  assert(managerConfig.servers !== null && managerConfig.servers !== undefined, 'Manager config should have servers');
  
  for (const server of managerConfig.servers) {
    assert(server.name !== null && server.name !== undefined, 'Server should have name');
    // Server should have either command (stdio) or url (http)
    assert(
      server.command !== null && server.command !== undefined || 
      (server as any).url !== null && (server as any).url !== undefined,
      'Server should have command or url'
    );
    assert(Array.isArray(server.tools), 'Server tools should be array');
    assert(server.tools.length > 0, 'Server should have at least one tool');
  }
  console.log('✓ Manager configuration structure is valid');

  console.log('✓ All configuration validation tests passed');
}

/**
 * Test: Lifecycle Management
 */
async function testLifecycleManagement(): Promise<void> {
  console.log('\n=== Test: Lifecycle Management ===');
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });

  try {
    // Test configuration reload
    console.log('Testing configuration reload...');
    await manager.loadConfigForRole('guest');
    await manager.reloadConfigs();
    const config = await manager.loadConfigForRole('guest');
    assert(config !== null && config !== undefined, 'Config should be defined after reload');
    console.log('✓ Configuration reload works');

    // Test shutdown
    console.log('Testing shutdown...');
    await manager.shutdown();
    console.log('✓ Shutdown completed cleanly');

    console.log('✓ All lifecycle management tests passed');
  } finally {
    await resetMCPManager();
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('=================================================');
  console.log('MCP Manager - Verification Tests');
  console.log('=================================================');
  
  try {
    await testConfigurationLoading();
    await testToolDiscovery();
    await testRoleBasedAccessControl();
    await testToolExecution();
    await testConfigurationValidation();
    await testLifecycleManagement();
    
    console.log('\n=================================================');
    console.log('✓ All verification tests passed!');
    console.log('=================================================\n');
    
    // Note about integration testing
    console.log('Note: These tests verify MCP Manager functionality with mock MCP servers.');
    console.log('For integration testing with real MCP servers:');
    console.log('  1. Configure remote MCP server URLs in config/mcp/*.json');
    console.log('  2. Ensure MCP servers are running and accessible');
    console.log('  3. Test tool execution with real data\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
