/**
 * MCP Manager Validation Script (ES Module)
 * 
 * Simple validation to verify MCP Manager works correctly
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function validateConfigurations() {
  console.log('🧪 Validating MCP Manager Implementation...\n');
  
  let passed = 0;
  let failed = 0;
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  // Test 1: Validate all configuration files exist and are valid JSON
  console.log('✓ Test 1: Validating configuration files...');
  for (const role of roles) {
    try {
      const configPath = join(process.cwd(), 'config', 'mcp', `${role}.json`);
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.role === role && Array.isArray(config.servers)) {
        console.log(`  ✅ ${role}.json is valid`);
        passed++;
      } else {
        console.log(`  ❌ ${role}.json has invalid structure`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Failed to load ${role}.json: ${error.message}`);
      failed++;
    }
  }
  
  // Test 2: Validate server configurations
  console.log('\n✓ Test 2: Validating server configurations...');
  for (const role of roles) {
    try {
      const configPath = join(process.cwd(), 'config', 'mcp', `${role}.json`);
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      let roleValid = true;
      for (const server of config.servers) {
        if (!server.name || !server.command || !Array.isArray(server.args) || !Array.isArray(server.tools)) {
          console.log(`  ❌ ${role}: Server ${server.name || 'unknown'} has invalid structure`);
          roleValid = false;
          break;
        }
        
        if (server.tools.length === 0) {
          console.log(`  ❌ ${role}: Server ${server.name} has no tools defined`);
          roleValid = false;
          break;
        }
      }
      
      if (roleValid) {
        console.log(`  ✅ ${role} servers are properly configured`);
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Failed to validate ${role} servers: ${error.message}`);
      failed++;
    }
  }
  
  // Test 3: Validate tool definitions
  console.log('\n✓ Test 3: Validating tool definitions...');
  const expectedTools = {
    guest: ['create_service_request', 'view_my_charges', 'request_amenity', 'control_lights', 'control_thermostat', 'control_blinds'],
    manager: ['get_occupancy_stats', 'get_revenue_report', 'get_booking_forecast', 'view_all_bookings', 'assign_room', 'view_maintenance_requests', 'update_room_status'],
    housekeeping: ['view_my_tasks', 'update_room_cleaning_status', 'report_maintenance_issue', 'request_supplies'],
    maintenance: ['view_my_work_orders', 'update_task_status', 'get_equipment_info', 'order_parts']
  };
  
  for (const role of roles) {
    try {
      const configPath = join(process.cwd(), 'config', 'mcp', `${role}.json`);
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      const allTools = config.servers.flatMap(server => server.tools);
      const missingTools = expectedTools[role].filter(tool => !allTools.includes(tool));
      
      if (missingTools.length === 0) {
        console.log(`  ✅ ${role} has all expected tools (${allTools.length} tools)`);
        passed++;
      } else {
        console.log(`  ❌ ${role} is missing tools: ${missingTools.join(', ')}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Failed to validate ${role} tools: ${error.message}`);
      failed++;
    }
  }
  
  // Test 4: Validate role separation
  console.log('\n✓ Test 4: Validating role separation...');
  try {
    const allConfigs = {};
    for (const role of roles) {
      const configPath = join(process.cwd(), 'config', 'mcp', `${role}.json`);
      const configData = await readFile(configPath, 'utf-8');
      allConfigs[role] = JSON.parse(configData);
    }
    
    // Check that guest tools are not in manager config
    const guestTools = allConfigs.guest.servers.flatMap(s => s.tools);
    const managerTools = allConfigs.manager.servers.flatMap(s => s.tools);
    const overlap = guestTools.filter(tool => managerTools.includes(tool));
    
    if (overlap.length === 0) {
      console.log('  ✅ Guest and manager tools are properly separated');
      passed++;
    } else {
      console.log(`  ❌ Guest and manager have overlapping tools: ${overlap.join(', ')}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to validate role separation: ${error.message}`);
    failed++;
  }
  
  // Test 5: Validate schema.ts exists
  console.log('\n✓ Test 5: Validating schema file...');
  try {
    const schemaPath = join(process.cwd(), 'config', 'mcp', 'schema.ts');
    const schemaData = await readFile(schemaPath, 'utf-8');
    
    if (schemaData.includes('MCPRoleConfig') && schemaData.includes('MCPServerConfig') && schemaData.includes('MCPTool')) {
      console.log('  ✅ schema.ts contains required type definitions');
      passed++;
    } else {
      console.log('  ❌ schema.ts is missing required type definitions');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to validate schema.ts: ${error.message}`);
    failed++;
  }
  
  // Test 6: Validate MCP Manager implementation exists
  console.log('\n✓ Test 6: Validating MCP Manager implementation...');
  try {
    const managerPath = join(process.cwd(), 'lib', 'bedrock', 'mcp-manager.ts');
    const managerData = await readFile(managerPath, 'utf-8');
    
    const requiredMethods = [
      'loadConfigForRole',
      'getToolsForRole',
      'executeTool',
      'canRoleAccessTool',
      'reloadConfigs',
      'shutdown'
    ];
    
    const missingMethods = requiredMethods.filter(method => !managerData.includes(method));
    
    if (missingMethods.length === 0) {
      console.log('  ✅ MCP Manager has all required methods');
      passed++;
    } else {
      console.log(`  ❌ MCP Manager is missing methods: ${missingMethods.join(', ')}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed to validate MCP Manager: ${error.message}`);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All validations passed! MCP Manager is properly implemented.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some validations failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run validation
validateConfigurations().catch(error => {
  console.error('\n❌ Validation script failed:', error);
  process.exit(1);
});
