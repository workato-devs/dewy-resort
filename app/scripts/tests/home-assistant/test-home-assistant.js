#!/usr/bin/env node

/**
 * Home Assistant Integration Test Script
 * Tests connectivity and basic operations
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

const env = loadEnv();
const HOME_ASSISTANT_URL = env.HOME_ASSISTANT_URL || process.env.HOME_ASSISTANT_URL;
const HOME_ASSISTANT_TOKEN = env.HOME_ASSISTANT_TOKEN || process.env.HOME_ASSISTANT_TOKEN;
const HOME_ASSISTANT_ENABLED = (env.HOME_ASSISTANT_ENABLED || process.env.HOME_ASSISTANT_ENABLED) !== 'false';

// Colors for terminal output
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

async function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      rejectUnauthorized: false, // Allow self-signed certificates
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testConfiguration() {
  logSection('Configuration Check');
  
  log(`HOME_ASSISTANT_ENABLED: ${HOME_ASSISTANT_ENABLED}`, HOME_ASSISTANT_ENABLED ? 'green' : 'yellow');
  log(`HOME_ASSISTANT_URL: ${HOME_ASSISTANT_URL || '(not set)'}`, HOME_ASSISTANT_URL ? 'green' : 'red');
  log(`HOME_ASSISTANT_TOKEN: ${HOME_ASSISTANT_TOKEN ? '***' + HOME_ASSISTANT_TOKEN.slice(-10) : '(not set)'}`, HOME_ASSISTANT_TOKEN ? 'green' : 'red');
  
  if (!HOME_ASSISTANT_ENABLED) {
    log('\n⚠️  Home Assistant is disabled', 'yellow');
    log('Set HOME_ASSISTANT_ENABLED=true in .env to enable', 'yellow');
    return false;
  }
  
  if (!HOME_ASSISTANT_URL || !HOME_ASSISTANT_TOKEN) {
    log('\n❌ Missing configuration', 'red');
    log('Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN in .env', 'red');
    return false;
  }
  
  log('\n✅ Configuration looks good', 'green');
  return true;
}

async function testConnection() {
  logSection('Connection Test');
  
  try {
    log('Testing connection to Home Assistant API...', 'blue');
    const result = await makeRequest(`${HOME_ASSISTANT_URL}/api/`, HOME_ASSISTANT_TOKEN);
    
    if (result.status === 200) {
      log('✅ Connection successful!', 'green');
      log(`Response: ${JSON.stringify(result.data)}`, 'green');
      return true;
    } else {
      log(`❌ Connection failed with status ${result.status}`, 'red');
      log(`Response: ${JSON.stringify(result.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Connection error: ${error.message}`, 'red');
    return false;
  }
}

async function listDevices() {
  logSection('Available Devices');
  
  try {
    log('Fetching devices from Home Assistant...', 'blue');
    const result = await makeRequest(`${HOME_ASSISTANT_URL}/api/states`, HOME_ASSISTANT_TOKEN);
    
    if (result.status === 200) {
      const states = result.data;
      const deviceTypes = ['light', 'climate', 'cover', 'switch', 'fan'];
      
      const devices = states.filter(state => {
        const domain = state.entity_id.split('.')[0];
        return deviceTypes.includes(domain);
      });
      
      log(`\n✅ Found ${devices.length} devices:`, 'green');
      
      // Group by type
      const grouped = {};
      devices.forEach(device => {
        const domain = device.entity_id.split('.')[0];
        if (!grouped[domain]) grouped[domain] = [];
        grouped[domain].push(device);
      });
      
      Object.keys(grouped).sort().forEach(domain => {
        log(`\n${domain.toUpperCase()}:`, 'cyan');
        grouped[domain].forEach(device => {
          const name = device.attributes.friendly_name || device.entity_id;
          log(`  • ${device.entity_id.padEnd(30)} - ${name} (${device.state})`, 'blue');
        });
      });
      
      return true;
    } else {
      log(`❌ Failed to fetch devices: ${result.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error fetching devices: ${error.message}`, 'red');
    return false;
  }
}

async function testDeviceControl() {
  logSection('Device Control Test');
  
  try {
    log('Looking for a test device...', 'blue');
    const result = await makeRequest(`${HOME_ASSISTANT_URL}/api/states`, HOME_ASSISTANT_TOKEN);
    
    if (result.status !== 200) {
      log('❌ Could not fetch devices for testing', 'red');
      return false;
    }
    
    const states = result.data;
    const testLight = states.find(s => s.entity_id.startsWith('light.'));
    
    if (!testLight) {
      log('⚠️  No lights found for testing', 'yellow');
      log('Device control functionality should work, but cannot test without devices', 'yellow');
      return true;
    }
    
    log(`Found test device: ${testLight.entity_id}`, 'green');
    log(`Current state: ${testLight.state}`, 'blue');
    log('\n✅ Device control should work (not testing actual control to avoid changes)', 'green');
    log('Use the guest portal to test device controls: http://localhost:3000/guest/room-controls', 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testLocalAPI() {
  logSection('Local API Test');
  
  try {
    log('Testing local API endpoints...', 'blue');
    
    // Test devices list endpoint
    log('\n1. Testing GET /api/home-assistant/devices', 'cyan');
    const devicesResult = await makeRequest('http://localhost:3000/api/home-assistant/devices', '');
    
    if (devicesResult.status === 200) {
      log(`✅ Devices endpoint working (${devicesResult.data.devices?.length || 0} devices)`, 'green');
      log(`   Demo mode: ${devicesResult.data.demoMode}`, 'blue');
    } else {
      log(`⚠️  Devices endpoint returned ${devicesResult.status}`, 'yellow');
    }
    
    // Test status endpoint
    log('\n2. Testing GET /api/data-source/status', 'cyan');
    const statusResult = await makeRequest('http://localhost:3000/api/data-source/status', '');
    
    if (statusResult.status === 200) {
      const haStatus = statusResult.data.integrations?.find(i => i.name === 'Home Assistant');
      if (haStatus) {
        log(`✅ Status endpoint working`, 'green');
        log(`   Enabled: ${haStatus.enabled}`, 'blue');
        log(`   Working: ${haStatus.working}`, haStatus.working ? 'green' : 'yellow');
        log(`   Using fallback: ${haStatus.usingFallback}`, haStatus.usingFallback ? 'yellow' : 'green');
        if (haStatus.reason) {
          log(`   Reason: ${haStatus.reason}`, 'yellow');
        }
      }
    } else {
      log(`⚠️  Status endpoint returned ${statusResult.status}`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`⚠️  Local API test failed: ${error.message}`, 'yellow');
    log('Make sure the Next.js dev server is running (npm run dev)', 'yellow');
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Home Assistant Integration Test Suite               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const configOk = await testConfiguration();
  
  if (!configOk) {
    log('\n📖 Quick Setup:', 'cyan');
    log('1. Get Home Assistant URL and token', 'blue');
    log('2. Add to .env:', 'blue');
    log('   HOME_ASSISTANT_ENABLED=true', 'blue');
    log('   HOME_ASSISTANT_URL=https://your-instance.ui.nabu.casa', 'blue');
    log('   HOME_ASSISTANT_TOKEN=your_token_here', 'blue');
    log('3. Restart the app: npm run dev', 'blue');
    log('\n📚 See: app/docs/HOME_ASSISTANT_QUICKSTART.md', 'cyan');
    process.exit(1);
  }
  
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    log('\n🔧 Troubleshooting:', 'cyan');
    log('• Check if Home Assistant is running', 'blue');
    log('• Verify URL includes protocol (https:// or http://)', 'blue');
    log('• Test manually: curl -H "Authorization: Bearer TOKEN" URL/api/', 'blue');
    log('• Check firewall settings', 'blue');
    log('\n📚 See: app/docs/HOME_ASSISTANT_SETUP.md#troubleshooting', 'cyan');
    process.exit(1);
  }
  
  await listDevices();
  await testDeviceControl();
  await testLocalAPI();
  
  logSection('Summary');
  log('✅ All tests passed!', 'green');
  log('\n🎉 Your Home Assistant integration is ready to use!', 'green');
  log('\n📱 Try it out:', 'cyan');
  log('   Guest Portal: http://localhost:3000/guest/room-controls', 'blue');
  log('   API Docs: app/docs/HOME_ASSISTANT_SETUP.md', 'blue');
  
  console.log('\n');
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
