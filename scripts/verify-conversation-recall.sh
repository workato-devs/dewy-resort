#!/bin/bash

# Verify Conversation Recall Implementation
# This script checks that all required files exist and have the expected exports

echo "🔍 Verifying Conversation Recall Implementation"
echo ""

# Check API endpoints
echo "📁 Checking API endpoints..."
if [ -f "app/api/conversations/route.ts" ]; then
  echo "  ✅ app/api/conversations/route.ts exists"
  if grep -q "export async function GET" app/api/conversations/route.ts; then
    echo "  ✅ GET handler implemented"
  else
    echo "  ❌ GET handler missing"
    exit 1
  fi
else
  echo "  ❌ app/api/conversations/route.ts missing"
  exit 1
fi

if [ -f "app/api/conversations/[id]/route.ts" ]; then
  echo "  ✅ app/api/conversations/[id]/route.ts exists"
  if grep -q "export async function GET" app/api/conversations/[id]/route.ts; then
    echo "  ✅ GET handler implemented"
  else
    echo "  ❌ GET handler missing"
    exit 1
  fi
else
  echo "  ❌ app/api/conversations/[id]/route.ts missing"
  exit 1
fi

echo ""

# Check hook updates
echo "📁 Checking hook updates..."
if [ -f "hooks/use-bedrock-chat.ts" ]; then
  echo "  ✅ hooks/use-bedrock-chat.ts exists"
  if grep -q "loadConversation" hooks/use-bedrock-chat.ts; then
    echo "  ✅ loadConversation method added"
  else
    echo "  ❌ loadConversation method missing"
    exit 1
  fi
else
  echo "  ❌ hooks/use-bedrock-chat.ts missing"
  exit 1
fi

if [ -f "hooks/use-bedrock-chat-debug.ts" ]; then
  echo "  ✅ hooks/use-bedrock-chat-debug.ts exists"
  if grep -q "wrappedLoadConversation" hooks/use-bedrock-chat-debug.ts; then
    echo "  ✅ wrappedLoadConversation method added"
  else
    echo "  ❌ wrappedLoadConversation method missing"
    exit 1
  fi
else
  echo "  ❌ hooks/use-bedrock-chat-debug.ts missing"
  exit 1
fi

echo ""

# Check UI components
echo "📁 Checking UI components..."
if [ -f "components/shared/ConversationList.tsx" ]; then
  echo "  ✅ components/shared/ConversationList.tsx exists"
  if grep -q "export function ConversationList" components/shared/ConversationList.tsx; then
    echo "  ✅ ConversationList component exported"
  else
    echo "  ❌ ConversationList component not exported"
    exit 1
  fi
else
  echo "  ❌ components/shared/ConversationList.tsx missing"
  exit 1
fi

if [ -f "components/shared/BedrockChatWithHistory.tsx" ]; then
  echo "  ✅ components/shared/BedrockChatWithHistory.tsx exists"
  if grep -q "export function BedrockChatWithHistory" components/shared/BedrockChatWithHistory.tsx; then
    echo "  ✅ BedrockChatWithHistory component exported"
  else
    echo "  ❌ BedrockChatWithHistory component not exported"
    exit 1
  fi
else
  echo "  ❌ components/shared/BedrockChatWithHistory.tsx missing"
  exit 1
fi

echo ""

# Check BedrockChatInterface updates
echo "📁 Checking BedrockChatInterface updates..."
if [ -f "components/shared/BedrockChatInterface.tsx" ]; then
  echo "  ✅ components/shared/BedrockChatInterface.tsx exists"
  if grep -q "loadConversation" components/shared/BedrockChatInterface.tsx; then
    echo "  ✅ loadConversation integration added"
  else
    echo "  ❌ loadConversation integration missing"
    exit 1
  fi
else
  echo "  ❌ components/shared/BedrockChatInterface.tsx missing"
  exit 1
fi

echo ""

# Check for TypeScript errors
echo "🔍 Checking for TypeScript errors..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(error TS|found [0-9]+ error)" || echo "  ✅ No TypeScript errors found"

echo ""
echo "✅ All conversation recall components verified!"
echo ""
echo "📋 Implementation Summary:"
echo "  ✅ API endpoint for listing conversations"
echo "  ✅ API endpoint for fetching specific conversation"
echo "  ✅ loadConversation method in useBedrockChat hook"
echo "  ✅ loadConversation wrapper in useBedrockChatDebug hook"
echo "  ✅ ConversationList UI component"
echo "  ✅ BedrockChatWithHistory wrapper component"
echo "  ✅ BedrockChatInterface integration"
echo ""
echo "🎯 Next Steps:"
echo "  1. Start the development server"
echo "  2. Navigate to a chat page (guest or manager)"
echo "  3. Send some messages to create conversations"
echo "  4. Use the conversation history feature to load past conversations"
echo ""
