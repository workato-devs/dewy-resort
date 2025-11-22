const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config/mcp/manager.json', 'utf-8'));
const requiredTools = ['get_occupancy_stats', 'get_revenue_report', 'view_all_bookings', 'assign_room'];
const allTools = config.servers.flatMap(s => s.tools);

console.log('Required tools verification:');
let allPresent = true;
requiredTools.forEach(tool => {
  const present = allTools.includes(tool);
  console.log(present ? '  ✓' : '  ✗', tool);
  if (!present) allPresent = false;
});

if (allPresent) {
  console.log('\n✓ All required tools are configured!');
  process.exit(0);
} else {
  console.log('\n✗ Some required tools are missing!');
  process.exit(1);
}
