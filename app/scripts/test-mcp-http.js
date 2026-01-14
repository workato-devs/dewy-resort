#!/usr/bin/env node

/**
 * Test MCP HTTP Server Connection
 * 
 * This script directly tests the HTTP connection to MCP servers
 * to verify they're responding correctly.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env file');
  }
}

loadEnv();

async function testMCPServer(name, url, token) {
  console.log(`\n🔍 Testing ${name}`);
  console.log(`   URL: ${url}`);
  
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': postData.length
    },
    timeout: 10000
  };
  
  return new Promise((resolve, reject) => {
    // Remove trailing slash from URL if present
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const req = https.request(baseUrl + '/tools/list', options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            console.log(`   ❌ Error: ${json.error.message || JSON.stringify(json.error)}`);
            resolve({ success: false, error: json.error });
            return;
          }
          
          const tools = json.result?.tools || json.result || [];
          
          if (!Array.isArray(tools)) {
            console.log(`   ⚠️  Unexpected response format`);
            console.log(`   Response:`, JSON.stringify(json, null, 2));
            resolve({ success: false, error: 'Invalid response format' });
            return;
          }
          
          console.log(`   ✅ Success! Discovered ${tools.length} tools`);
          
          if (tools.length > 0) {
            console.log(`   Tools:`);
            tools.forEach(tool => {
              const params = Object.keys(tool.inputSchema?.properties || {});
              console.log(`     - ${tool.name} (${params.length} params)`);
            });
          }
          
          resolve({ success: true, tools });
        } catch (error) {
          console.log(`   ❌ Parse error: ${error.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}...`);
          resolve({ success: false, error: error.message });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Connection error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      console.log(`   ❌ Request timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n🧪 Testing MCP Server Connections\n');
  console.log('=' .repeat(60));
  
  const servers = [
    {
      name: 'Hotel Operations',
      url: process.env.MCP_OPERATIONS_URL,
      token: process.env.MCP_OPERATIONS_TOKEN
    },
    {
      name: 'Hotel Analytics',
      url: process.env.MCP_ANALYTICS_URL,
      token: process.env.MCP_ANALYTICS_TOKEN
    },
    {
      name: 'Hotel Services',
      url: process.env.MCP_HOTEL_SERVICES_URL,
      token: process.env.MCP_HOTEL_SERVICES_TOKEN
    }
  ];
  
  for (const server of servers) {
    if (!server.url || !server.token) {
      console.log(`\n⏭️  Skipping ${server.name} (not configured)`);
      continue;
    }
    
    await testMCPServer(server.name, server.url, server.token);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete!\n');
}

main().catch(console.error);
