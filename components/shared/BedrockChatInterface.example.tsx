/**
 * BedrockChatInterface Usage Examples
 * 
 * This file demonstrates how to use the BedrockChatInterface component
 * in different contexts and with different roles.
 */

'use client';

import { BedrockChatInterface } from './BedrockChatInterface';

/**
 * Example 1: Guest Chat
 * Basic usage for guest role
 */
export function GuestChatExample() {
  return (
    <div className="container mx-auto p-4">
      <BedrockChatInterface role="guest" />
    </div>
  );
}

/**
 * Example 2: Manager Chat
 * Usage for manager role with custom error handling
 */
export function ManagerChatExample() {
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
    // Custom error handling logic
  };

  return (
    <div className="container mx-auto p-4">
      <BedrockChatInterface 
        role="manager" 
        onError={handleError}
      />
    </div>
  );
}

/**
 * Example 3: Housekeeping Chat
 * Usage for housekeeping role with custom styling
 */
export function HousekeepingChatExample() {
  return (
    <div className="container mx-auto p-4">
      <BedrockChatInterface 
        role="housekeeping"
        className="max-w-4xl mx-auto"
      />
    </div>
  );
}

/**
 * Example 4: Maintenance Chat
 * Usage for maintenance role with conversation ID
 */
export function MaintenanceChatExample() {
  const conversationId = 'conv_123'; // From previous session

  return (
    <div className="container mx-auto p-4">
      <BedrockChatInterface 
        role="maintenance"
        conversationId={conversationId}
      />
    </div>
  );
}

/**
 * Example 5: Full Page Chat
 * Usage in a full-page layout
 */
export function FullPageChatExample() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">AI Assistant</h1>
        <BedrockChatInterface 
          role="guest"
          className="h-[calc(100vh-8rem)]"
        />
      </div>
    </div>
  );
}

/**
 * Example 6: Side-by-Side Layout
 * Chat alongside other content
 */
export function SideBySideChatExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        {/* Other dashboard content */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
          <p>Dashboard content here...</p>
        </div>
      </div>
      
      <div>
        <BedrockChatInterface role="manager" />
      </div>
    </div>
  );
}
