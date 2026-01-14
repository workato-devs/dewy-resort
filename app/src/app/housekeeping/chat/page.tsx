/**
 * Housekeeping Chat Page
 * Chat interface with Housekeeping AI assistant
 * 
 * Features:
 * - Bedrock streaming chat when available (Cognito + Identity Pool)
 * - Housekeeping-specific UI elements and context
 * - Task management and status updates
 * - Maintenance issue reporting
 * - Supply requests
 * 
 * Requirements: 1.1, 1.5, 13.3
 */

'use client';

import { useState, useEffect } from 'react';
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  AlertCircle, 
  Package, 
  CheckCircle2,
  Info
} from 'lucide-react';

/**
 * Chat configuration from API
 */
interface ChatConfig {
  enabled: boolean;
  reason?: string;
  features: {
    streaming: boolean;
    tools: boolean;
  };
}

export default function HousekeepingChatPage() {
  // State for feature detection
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [bedrockEnabled, setBedrockEnabled] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Check Bedrock availability on mount
  useEffect(() => {
    checkBedrockAvailability();
  }, []);

  /**
   * Check if Bedrock chat is available
   * Requirements: 15.1, 15.2, 15.3, 15.4
   */
  const checkBedrockAvailability = async () => {
    try {
      const response = await fetch('/api/chat/config');
      
      if (!response.ok) {
        throw new Error('Failed to check chat configuration');
      }

      const config: ChatConfig = await response.json();
      
      setBedrockEnabled(config.enabled);
      
      if (!config.enabled && config.reason) {
        setConfigError(config.reason);
        console.info('Bedrock chat not available:', config.reason);
      }
    } catch (error) {
      console.error('Error checking Bedrock availability:', error);
      setBedrockEnabled(false);
      setConfigError('Unable to check AI chat availability');
    } finally {
      setIsInitialLoading(false);
    }
  };

  /**
   * Handle errors from Bedrock chat
   */
  const handleBedrockError = (error: Error) => {
    console.error('Bedrock chat error:', error);
    toast({
      title: 'Chat Error',
      description: error.message || 'An error occurred in the chat',
      variant: 'destructive',
    });
  };

  // Show loading state while checking configuration
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Housekeeping Assistant</h1>
        <p className="text-muted-foreground">
          Your AI assistant for managing cleaning tasks, reporting issues, and requesting supplies
        </p>
        
        {/* Show info message if Bedrock not available */}
        {!bedrockEnabled && configError && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  AI Assistant Unavailable
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {configError}. Please contact your supervisor for assistance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Housekeeping-specific quick actions */}
      {bedrockEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">View Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: "Show me my cleaning tasks for today"
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Update Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: "Mark room 305 as cleaned"
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Request Supplies</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: "I need more cleaning supplies"
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Housekeeping tips */}
      {bedrockEnabled && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                How to Use Your Assistant
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-blue-950">1</Badge>
                <span>View your assigned cleaning tasks and priorities</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-blue-950">2</Badge>
                <span>Update room status as you complete cleaning</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-blue-950">3</Badge>
                <span>Report maintenance issues found during cleaning</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-blue-950">4</Badge>
                <span>Request supplies when running low</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Render Bedrock chat if available */}
      {bedrockEnabled ? (
        <BedrockChatInterface
          role="housekeeping"
          onError={handleBedrockError}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Chat Unavailable</CardTitle>
            <CardDescription>
              The AI assistant is currently unavailable. Please contact your supervisor for assistance with:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Viewing your cleaning task assignments</li>
              <li>Updating room cleaning status</li>
              <li>Reporting maintenance issues</li>
              <li>Requesting cleaning supplies</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
