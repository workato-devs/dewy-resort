/**
 * MCP Manager Validation Script
 * 
 * Simple validation script to verify MCP Manager functionality
 * without requiring a full test framework.
 */

const { MCPManager, resetMCPManager } = require('../mcp-manager');

async function validateMCPManager() {
  console.log('🧪 Validating MCP Manager Implementation...\n');
  
  let passed = 0;
  let failed = 0;
  
  const manager = new MCPManager({
    debug: false,
    toolTimeout: 5000,
    idleTimeout: 60000,
  });
  
  // Test 1: Load guest configuration
  try {
    console.log('✓ Test 1: Loading guest configuration...');
    const guestConfig = await manager.loadConfigForRole('guest');
    if (guestConfig && guestConfig.role === 'guest' && guestConfig.servers.length > 0) {
      console.log('  ✅ Guest configuration loaded successfully');
      console.log(`     Found ${guestConfig.servers.length} server(s)`);
      passed++;
    } else {
      console.log('  ❌ Guest configuration invalid');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to load guest configuration: ${error.message}`);
    failed++;
  }
  
  // Test 2: Load manager configuration
  try {
    console.log('\n✓ Test 2: Loading manager configuration...');
    const managerConfig = await manager.loadConfigForRole('manager');
    if (managerConfig && managerConfig.role === 'manager' && managerConfig.servers.length > 0) {
      console.log('  ✅ Manager configuration loaded successfully');
      console.log(`     Found ${managerConfig.servers.length} server(s)`);
      passed++;
    } else {
      console.log('  ❌ Manager configuration invalid');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to load manager configuration: ${error.message}`);
    failed++;
  }
  
  // Test 3: Load housekeeping configuration
  try {
    console.log('\n✓ Test 3: Loading housekeeping configuration...');
    const housekeepingConfig = await manager.loadConfigForRole('housekeeping');
    if (housekeepingConfig && housekeepingConfig.role === 'housekeeping') {
      console.log('  ✅ Housekeeping configuration loaded successfully');
      console.log(`     Found ${housekeepingConfig.servers.length} server(s)`);
      passed++;
    } else {
      console.log('  ❌ Housekeeping configuration invalid');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to load housekeeping configuration: ${error.message}`);
    failed++;
  }
  
  // Test 4: Load maintenance configuration
  try {
    console.log('\n✓ Test 4: Loading maintenance configuration...');
    const maintenanceConfig = await manager.loadConfigForRole('maintenance');
    if (maintenanceConfig && maintenanceConfig.role === 'maintenance') {
      console.log('  ✅ Maintenance configuration loaded successfully');
      console.log(`     Found ${maintenanceConfig.servers.length} server(s)`);
      passed++;
    } else {
      console.log('  ❌ Maintenance configuration invalid');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to load maintenance configuration: ${error.message}`);
    failed++;
  }
  
  // Test 5: Discover guest tools
  try {
    console.log('\n✓ Test 5: Discovering guest tools...');
    const guestTools = await manager.getToolsForRole('guest');
    if (guestTools && guestTools.length > 0) {
      console.log('  ✅ Guest tools discovered successfully');
      console.log(`     Found ${guestTools.length} tool(s):`);
      guestTools.forEach(tool => console.log(`       - ${tool.name}`));
      passed++;
    } else {
      console.log('  ❌ No guest tools found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to discover guest tools: ${error.message}`);
    failed++;
  }
  
  // Test 6: Discover manager tools
  try {
    console.log('\n✓ Test 6: Discovering manager tools...');
    const managerTools = await manager.getToolsForRole('manager');
    if (managerTools && managerTools.length > 0) {
      console.log('  ✅ Manager tools discovered successfully');
      console.log(`     Found ${managerTools.length} tool(s):`);
      managerTools.forEach(tool => console.log(`       - ${tool.name}`));
      passed++;
    } else {
      console.log('  ❌ No manager tools found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to discover manager tools: ${error.message}`);
    failed++;
  }
  
  // Test 7: Role-based access control - guest can access guest tools
  try {
    console.log('\n✓ Test 7: Testing role-based access control (guest -> guest tool)...');
    const canAccess = await manager.canRoleAccessTool('guest', 'create_service_request');
    if (canAccess === true) {
      console.log('  ✅ Guest can access guest tools');
      passed++;
    } else {
      console.log('  ❌ Guest cannot access guest tools (should be able to)');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to check tool access: ${error.message}`);
    failed++;
  }
  
  // Test 8: Role-based access control - guest cannot access manager tools
  try {
    console.log('\n✓ Test 8: Testing role-based access control (guest -> manager tool)...');
    const canAccess = await manager.canRoleAccessTool('guest', 'get_occupancy_stats');
    if (canAccess === false) {
      console.log('  ✅ Guest correctly denied access to manager tools');
      passed++;
    } else {
      console.log('  ❌ Guest can access manager tools (should not be able to)');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to check tool access: ${error.message}`);
    failed++;
  }
  
  // Test 9: Tool execution for authorized role
  try {
    console.log('\n✓ Test 9: Executing tool for authorized role...');
    const result = await manager.executeTool(
      'guest',
      'create_service_request',
      { category: 'housekeeping', description: 'Test request' },
      'test-user-123'
    );
    if (result && result.success === true) {
      console.log('  ✅ Tool executed successfully for authorized role');
      passed++;
    } else {
      console.log(`  ❌ Tool execution failed: ${result?.error || 'Unknown error'}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to execute tool: ${error.message}`);
    failed++;
  }
  
  // Test 10: Tool execution denied for unauthorized role
  try {
    console.log('\n✓ Test 10: Attempting tool execution for unauthorized role...');
    const result = await manager.executeTool(
      'guest',
      'get_occupancy_stats',
      {},
      'test-user-123'
    );
    if (result && result.success === false && result.error.includes('not available')) {
      console.log('  ✅ Tool execution correctly denied for unauthorized role');
      passed++;
    } else {
      console.log('  ❌ Tool execution should have been denied');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to execute tool: ${error.message}`);
    failed++;
  }
  
  // Test 11: Configuration caching
  try {
    console.log('\n✓ Test 11: Testing configuration caching...');
    const config1 = await manager.loadConfigForRole('guest');
    const config2 = await manager.loadConfigForRole('guest');
    if (config1 === config2) {
      console.log('  ✅ Configuration caching works correctly');
      passed++;
    } else {
      console.log('  ❌ Configuration not cached properly');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to test caching: ${error.message}`);
    failed++;
  }
  
  // Test 12: Invalid role handling
  try {
    console.log('\n✓ Test 12: Testing invalid role handling...');
    try {
      await manager.loadConfigForRole('invalid-role');
      console.log('  ❌ Should have thrown error for invalid role');
      failed++;
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('  ✅ Invalid role correctly rejected');
        passed++;
      } else {
        console.log(`  ❌ Wrong error message: ${error.message}`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ❌ Unexpected error: ${error.message}`);
    failed++;
  }
  
  // Cleanup
  await manager.shutdown();
  await resetMCPManager();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All validations passed! MCP Manager is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some validations failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run validation
validateMCPManager().catch(error => {
  console.error('\n❌ Validation script failed:', error);
  process.exit(1);
});
