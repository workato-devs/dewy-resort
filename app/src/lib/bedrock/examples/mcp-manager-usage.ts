/**
 * MCP Manager Usage Examples
 * 
 * This file demonstrates how to use the MCP Manager in various scenarios.
 */

import { MCPManager, getMCPManager } from '../mcp-manager';

/**
 * Example 1: Basic Setup and Configuration Loading
 */
async function example1_BasicSetup() {
  console.log('Example 1: Basic Setup and Configuration Loading\n');
  
  // Create MCP Manager instance
  const manager = new MCPManager({
    debug: true,
    toolTimeout: 30000,
    idleTimeout: 1800000,
  });
  
  // Load configuration for guest role
  const guestConfig = await manager.loadConfigForRole('guest');
  console.log(`Guest role has ${guestConfig.servers.length} MCP servers configured`);
  
  // Load configuration for manager role
  const managerConfig = await manager.loadConfigForRole('manager');
  console.log(`Manager role has ${managerConfig.servers.length} MCP servers configured`);
  
  await manager.shutdown();
}

/**
 * Example 2: Tool Discovery
 */
async function example2_ToolDiscovery() {
  console.log('\nExample 2: Tool Discovery\n');
  
  const manager = getMCPManager();
  
  // Discover tools for guest role
  const guestTools = await manager.getToolsForRole('guest');
  console.log(`Guest has access to ${guestTools.length} tools:`);
  guestTools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  
  // Discover tools for manager role
  const managerTools = await manager.getToolsForRole('manager');
  console.log(`\nManager has access to ${managerTools.length} tools:`);
  managerTools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  
  await manager.shutdown();
}

/**
 * Example 3: Role-Based Access Control
 */
async function example3_AccessControl() {
  console.log('\nExample 3: Role-Based Access Control\n');
  
  const manager = getMCPManager();
  
  // Check guest access to guest tools
  const guestCanCreateRequest = await manager.canRoleAccessTool(
    'guest',
    'create_service_request'
  );
  console.log(`Guest can create service request: ${guestCanCreateRequest}`);
  
  // Check guest access to manager tools
  const guestCanViewStats = await manager.canRoleAccessTool(
    'guest',
    'get_occupancy_stats'
  );
  console.log(`Guest can view occupancy stats: ${guestCanViewStats}`);
  
  // Check manager access to manager tools
  const managerCanViewStats = await manager.canRoleAccessTool(
    'manager',
    'get_occupancy_stats'
  );
  console.log(`Manager can view occupancy stats: ${managerCanViewStats}`);
  
  // Check manager access to guest tools
  const managerCanCreateRequest = await manager.canRoleAccessTool(
    'manager',
    'create_service_request'
  );
  console.log(`Manager can create service request: ${managerCanCreateRequest}`);
  
  await manager.shutdown();
}

/**
 * Example 4: Tool Execution
 */
async function example4_ToolExecution() {
  console.log('\nExample 4: Tool Execution\n');
  
  const manager = getMCPManager();
  
  // Execute guest tool - create service request
  console.log('Executing: create_service_request');
  const serviceRequestResult = await manager.executeTool(
    'guest',
    'create_service_request',
    {
      category: 'housekeeping',
      description: 'Need extra towels',
      priority: 'medium'
    },
    'guest-user-123'
  );
  
  if (serviceRequestResult.success) {
    console.log('✓ Service request created successfully');
    console.log('  Result:', JSON.stringify(serviceRequestResult.result, null, 2));
  } else {
    console.log('✗ Service request failed:', serviceRequestResult.error);
  }
  
  // Execute manager tool - get occupancy stats
  console.log('\nExecuting: get_occupancy_stats');
  const statsResult = await manager.executeTool(
    'manager',
    'get_occupancy_stats',
    {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    },
    'manager-user-456'
  );
  
  if (statsResult.success) {
    console.log('✓ Occupancy stats retrieved successfully');
    console.log('  Result:', JSON.stringify(statsResult.result, null, 2));
  } else {
    console.log('✗ Stats retrieval failed:', statsResult.error);
  }
  
  await manager.shutdown();
}

/**
 * Example 5: Error Handling
 */
async function example5_ErrorHandling() {
  console.log('\nExample 5: Error Handling\n');
  
  const manager = getMCPManager();
  
  // Attempt to execute unauthorized tool
  console.log('Attempting unauthorized tool execution...');
  const unauthorizedResult = await manager.executeTool(
    'guest',
    'get_occupancy_stats', // Manager-only tool
    {},
    'guest-user-123'
  );
  
  if (!unauthorizedResult.success) {
    console.log('✓ Correctly denied:', unauthorizedResult.error);
  }
  
  // Attempt to execute non-existent tool
  console.log('\nAttempting non-existent tool execution...');
  const nonExistentResult = await manager.executeTool(
    'guest',
    'non_existent_tool',
    {},
    'guest-user-123'
  );
  
  if (!nonExistentResult.success) {
    console.log('✓ Correctly rejected:', nonExistentResult.error);
  }
  
  // Attempt to load invalid role configuration
  console.log('\nAttempting to load invalid role...');
  try {
    await manager.loadConfigForRole('invalid-role');
    console.log('✗ Should have thrown error');
  } catch (error) {
    console.log('✓ Correctly threw error:', (error as Error).message);
  }
  
  await manager.shutdown();
}

/**
 * Example 6: Integration with Bedrock Chat
 */
async function example6_BedrockIntegration() {
  console.log('\nExample 6: Integration with Bedrock Chat\n');
  
  const manager = getMCPManager();
  
  // Simulate a chat session
  const userRole = 'guest';
  const userId = 'guest-user-789';
  
  // Get available tools for the user's role
  const tools = await manager.getToolsForRole(userRole);
  console.log(`User has access to ${tools.length} tools`);
  
  // Simulate LLM requesting tool use
  console.log('\nLLM requests tool: create_service_request');
  const toolRequest = {
    toolName: 'create_service_request',
    toolInput: {
      category: 'maintenance',
      description: 'Air conditioning not working',
      priority: 'high'
    }
  };
  
  // Execute the tool
  const result = await manager.executeTool(
    userRole,
    toolRequest.toolName,
    toolRequest.toolInput,
    userId
  );
  
  if (result.success) {
    console.log('✓ Tool executed successfully');
    console.log('  Returning result to LLM:', JSON.stringify(result.result, null, 2));
  } else {
    console.log('✗ Tool execution failed:', result.error);
  }
  
  await manager.shutdown();
}

/**
 * Example 7: Configuration Reloading
 */
async function example7_ConfigReloading() {
  console.log('\nExample 7: Configuration Reloading\n');
  
  const manager = getMCPManager();
  
  // Load initial configuration
  console.log('Loading initial configuration...');
  const config1 = await manager.loadConfigForRole('guest');
  console.log(`Loaded ${config1.servers.length} servers`);
  
  // Simulate configuration update (in real scenario, config files would be modified)
  console.log('\nReloading configurations...');
  await manager.reloadConfigs();
  
  // Load configuration again
  const config2 = await manager.loadConfigForRole('guest');
  console.log(`Reloaded ${config2.servers.length} servers`);
  
  await manager.shutdown();
}

/**
 * Example 8: Singleton Pattern Usage
 */
async function example8_SingletonPattern() {
  console.log('\nExample 8: Singleton Pattern Usage\n');
  
  // Get singleton instance
  const manager1 = getMCPManager({ debug: true });
  const manager2 = getMCPManager(); // Returns same instance
  
  console.log('manager1 === manager2:', manager1 === manager2);
  
  // Load configuration using singleton
  const tools = await manager1.getToolsForRole('guest');
  console.log(`Loaded ${tools.length} tools via singleton`);
  
  await manager1.shutdown();
}

/**
 * Example 9: Multiple Role Tool Discovery
 */
async function example9_MultipleRoles() {
  console.log('\nExample 9: Multiple Role Tool Discovery\n');
  
  const manager = getMCPManager();
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  for (const role of roles) {
    const tools = await manager.getToolsForRole(role);
    console.log(`\n${role.toUpperCase()} Role:`);
    console.log(`  Total tools: ${tools.length}`);
    console.log('  Tools:');
    tools.forEach(tool => {
      console.log(`    - ${tool.name}`);
    });
  }
  
  await manager.shutdown();
}

/**
 * Example 10: Housekeeping and Maintenance Roles
 */
async function example10_StaffRoles() {
  console.log('\nExample 10: Housekeeping and Maintenance Roles\n');
  
  const manager = getMCPManager();
  
  // Housekeeping staff
  console.log('Housekeeping Staff:');
  const housekeepingTools = await manager.getToolsForRole('housekeeping');
  console.log(`  Available tools: ${housekeepingTools.length}`);
  
  const canViewTasks = await manager.canRoleAccessTool('housekeeping', 'view_my_tasks');
  console.log(`  Can view tasks: ${canViewTasks}`);
  
  const canUpdateStatus = await manager.canRoleAccessTool('housekeeping', 'update_room_cleaning_status');
  console.log(`  Can update room status: ${canUpdateStatus}`);
  
  // Maintenance staff
  console.log('\nMaintenance Staff:');
  const maintenanceTools = await manager.getToolsForRole('maintenance');
  console.log(`  Available tools: ${maintenanceTools.length}`);
  
  const canViewWorkOrders = await manager.canRoleAccessTool('maintenance', 'view_my_work_orders');
  console.log(`  Can view work orders: ${canViewWorkOrders}`);
  
  const canOrderParts = await manager.canRoleAccessTool('maintenance', 'order_parts');
  console.log(`  Can order parts: ${canOrderParts}`);
  
  await manager.shutdown();
}

// Run examples
async function runExamples() {
  console.log('='.repeat(60));
  console.log('MCP Manager Usage Examples');
  console.log('='.repeat(60));
  
  try {
    await example1_BasicSetup();
    await example2_ToolDiscovery();
    await example3_AccessControl();
    await example4_ToolExecution();
    await example5_ErrorHandling();
    await example6_BedrockIntegration();
    await example7_ConfigReloading();
    await example8_SingletonPattern();
    await example9_MultipleRoles();
    await example10_StaffRoles();
    
    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nError running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();

export {
  example1_BasicSetup,
  example2_ToolDiscovery,
  example3_AccessControl,
  example4_ToolExecution,
  example5_ErrorHandling,
  example6_BedrockIntegration,
  example7_ConfigReloading,
  example8_SingletonPattern,
  example9_MultipleRoles,
  example10_StaffRoles,
};
