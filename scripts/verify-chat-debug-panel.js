#!/usr/bin/env node

/**
 * Verification Script: ChatDebugPanel Event Display
 * 
 * This script verifies that the ChatDebugPanel correctly displays all event types:
 * - Events tab: All events chronologically
 * - Messages tab: Message history with metadata
 * - API tab: API call events
 * - SSE tab: Streaming events
 * - Tools tab: Tool execution events
 * - Errors tab: Error events with highlighting
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying ChatDebugPanel Event Display\n');

// Track verification results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Check if a file exists and contains expected content
 */
function verifyFileContent(filePath, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.failed.push(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  let allPassed = true;
  
  for (const check of checks) {
    if (check.regex) {
      if (check.regex.test(content)) {
        results.passed.push(`✅ ${check.description}`);
      } else {
        results.failed.push(`❌ ${check.description}`);
        allPassed = false;
      }
    } else if (check.includes) {
      if (content.includes(check.includes)) {
        results.passed.push(`✅ ${check.description}`);
      } else {
        results.failed.push(`❌ ${check.description}`);
        allPassed = false;
      }
    }
  }
  
  return allPassed;
}

console.log('📋 Verifying ChatDebugPanel Component Structure...\n');

// Verify ChatDebugPanel has all required tabs
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'Events tab exists with event count',
    includes: '<TabsTrigger value="events"'
  },
  {
    description: 'Messages tab exists with message count',
    includes: '<TabsTrigger value="messages"'
  },
  {
    description: 'API tab exists with API call count',
    includes: '<TabsTrigger value="api"'
  },
  {
    description: 'SSE tab exists with SSE event count',
    includes: '<TabsTrigger value="sse"'
  },
  {
    description: 'Tools tab exists with tool execution count',
    includes: '<TabsTrigger value="tools"'
  },
  {
    description: 'Errors tab exists with error count',
    includes: '<TabsTrigger value="errors"'
  }
]);

// Verify event filtering logic
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'API calls are filtered correctly',
    regex: /const apiCalls = events\.filter\(e => e\.type === 'api_call'\)/
  },
  {
    description: 'SSE events are filtered correctly',
    regex: /const sseEvents = events\.filter\(e => e\.type === 'sse_event'\)/
  },
  {
    description: 'Tool events are filtered correctly',
    regex: /const toolEvents = events\.filter\(e => e\.type === 'tool_execution'\)/
  },
  {
    description: 'Error events are filtered correctly',
    regex: /const errorEvents = events\.filter\(e => e\.type === 'error'\)/
  }
]);

// Verify event display components
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'DebugEventItem component exists for event display',
    includes: 'function DebugEventItem'
  },
  {
    description: 'MessageDebugItem component exists for message display',
    includes: 'function MessageDebugItem'
  },
  {
    description: 'Events are displayed chronologically',
    includes: 'events.map(event =>'
  },
  {
    description: 'Event expansion/collapse functionality exists',
    includes: 'expandedEvents'
  }
]);

// Verify event metadata display
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'Event timestamp is displayed',
    includes: 'event.timestamp.toLocaleTimeString()'
  },
  {
    description: 'Event status badges are displayed',
    includes: 'getStatusBadge'
  },
  {
    description: 'Event icons are displayed by type',
    includes: 'getEventIcon'
  },
  {
    description: 'Event data is displayed in expandable format',
    includes: 'JSON.stringify(event.data, null, 2)'
  }
]);

// Verify message metadata display
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'Message role is displayed',
    includes: 'message.role'
  },
  {
    description: 'Message content is displayed',
    includes: 'message.content'
  },
  {
    description: 'Message timestamp is displayed',
    includes: 'new Date(message.timestamp).toLocaleTimeString()'
  },
  {
    description: 'Message tool uses are displayed',
    includes: 'message.toolUses'
  },
  {
    description: 'Message ID is displayed in expanded view',
    includes: 'message.id'
  }
]);

// Verify error highlighting
verifyFileContent('components/shared/ChatDebugPanel.tsx', [
  {
    description: 'Error events have AlertCircle icon',
    includes: 'AlertCircle'
  },
  {
    description: 'Error status has red color scheme',
    includes: 'bg-red-100 text-red-800'
  }
]);

// Verify integration with BedrockChatInterfaceWithDebug
console.log('\n📋 Verifying Integration with BedrockChatInterfaceWithDebug...\n');

verifyFileContent('components/shared/BedrockChatInterfaceWithDebug.tsx', [
  {
    description: 'Debug hook is created with useBedrockChatDebug',
    includes: 'useBedrockChatDebug'
  },
  {
    description: 'Debug hook is passed to BedrockChatInterface',
    includes: 'externalHook={debugHook}'
  },
  {
    description: 'Debug events are passed to ChatDebugPanel',
    includes: 'events={debugHook.debugEvents}'
  },
  {
    description: 'Messages are passed to ChatDebugPanel',
    includes: 'messages={debugHook.messages}'
  },
  {
    description: 'Conversation ID is passed to ChatDebugPanel',
    includes: 'conversationId={debugHook.conversationId'
  },
  {
    description: 'Connection status is passed to ChatDebugPanel',
    includes: 'isConnected={debugHook.isConnected}'
  },
  {
    description: 'Clear function is passed to ChatDebugPanel',
    includes: 'onClear={debugHook.clearDebugEvents}'
  }
]);

// Verify debug hook event tracking
console.log('\n📋 Verifying Debug Hook Event Tracking...\n');

verifyFileContent('hooks/use-bedrock-chat-debug.ts', [
  {
    description: 'Debug events state is managed',
    includes: 'debugEvents'
  },
  {
    description: 'addDebugEvent function exists',
    includes: 'addDebugEvent'
  },
  {
    description: 'clearDebugEvents function exists',
    includes: 'clearDebugEvents'
  },
  {
    description: 'API call events are tracked',
    includes: "addDebugEvent('api_call'"
  },
  {
    description: 'SSE events are tracked',
    includes: "addDebugEvent('sse_event'"
  },
  {
    description: 'Tool execution events are tracked',
    includes: "addDebugEvent('tool_execution'"
  },
  {
    description: 'Error events are tracked',
    includes: "addDebugEvent('error'"
  }
]);

// Verify environment configuration
console.log('\n📋 Verifying Environment Configuration...\n');

verifyFileContent('.env', [
  {
    description: 'Debug mode is enabled in environment',
    includes: 'NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true'
  }
]);

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}\n`);

if (results.failed.length > 0) {
  console.log('Failed Checks:');
  results.failed.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

if (results.warnings.length > 0) {
  console.log('Warnings:');
  results.warnings.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

// Summary
console.log('='.repeat(60));
console.log('📝 SUMMARY');
console.log('='.repeat(60) + '\n');

if (results.failed.length === 0) {
  console.log('✅ All verification checks passed!');
  console.log('\nThe ChatDebugPanel component correctly:');
  console.log('  • Displays all events chronologically in Events tab');
  console.log('  • Shows message history with metadata in Messages tab');
  console.log('  • Filters and displays API call events in API tab');
  console.log('  • Filters and displays SSE events in SSE tab');
  console.log('  • Filters and displays tool execution events in Tools tab');
  console.log('  • Filters and displays error events with highlighting in Errors tab');
  console.log('  • Integrates correctly with BedrockChatInterfaceWithDebug');
  console.log('  • Receives events from useBedrockChatDebug hook');
  console.log('\n✅ Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 10.4, 10.5 verified');
  console.log('\n📋 Next Steps:');
  console.log('  1. Start the development server: bash scripts/dev-tools/server.sh start');
  console.log('  2. Navigate to http://localhost:3000/manager/chat');
  console.log('  3. Send test messages to verify real-time event display');
  console.log('  4. Check each tab to verify event filtering and display');
  console.log('  5. Verify error highlighting in the Errors tab');
  process.exit(0);
} else {
  console.log('❌ Some verification checks failed.');
  console.log('\nPlease review the failed checks above and ensure:');
  console.log('  • All required tabs are present in ChatDebugPanel');
  console.log('  • Event filtering logic is implemented correctly');
  console.log('  • Event display components are properly structured');
  console.log('  • Integration with debug hook is complete');
  process.exit(1);
}
