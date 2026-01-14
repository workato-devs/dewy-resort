/**
 * Maintenance Chat Page
 * Chat interface with Maintenance AI assistant
 * 
 * Features:
 * - Bedrock streaming chat when available (Cognito + Identity Pool)
 * - Maintenance-specific UI elements and context
 * - Work order management and status updates
 * - Equipment information access
 * - Parts ordering
 * 
 * Requirements: 1.1, 1.5, 13.4
 */

'use client';

import { useState, useEffect } from 'react';
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  AlertCircle, 
  Package, 
  CheckCircle2,
  Info,
  FileText
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

export default function MaintenanceChatPage() {
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
        <h1 className="text-3xl font-bold">Maintenance Assistant</h1>
        <p className="text-muted-foreground">
          Your AI assistant for managing work orders, accessing equipment info, and ordering parts
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

      {/* Maintenance-specific quick actions */}
      {bedrockEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">View Work Orders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: &ldquo;Show me my work orders for today&rdquo;
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
                Ask: &ldquo;Mark work order #123 as complete&rdquo;
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Equipment Info</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: &ldquo;Get specs for HVAC unit in room 305&rdquo;
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Order Parts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Ask: &ldquo;I need to order replacement filters&rdquo;
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance tips */}
      {bedrockEnabled && (
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-base text-orange-900 dark:text-orange-100">
                How to Use Your Assistant
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-orange-950">1</Badge>
                <span>View your assigned work orders and maintenance tasks</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-orange-950">2</Badge>
                <span>Update task status as you complete repairs</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-orange-950">3</Badge>
                <span>Access equipment manuals and specifications</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 bg-white dark:bg-orange-950">4</Badge>
                <span>Order replacement parts and supplies</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Render Bedrock chat if available */}
      {bedrockEnabled ? (
        <BedrockChatInterface
          role="maintenance"
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
              <li>Viewing your work order assignments</li>
              <li>Updating task completion status</li>
              <li>Accessing equipment information</li>
              <li>Ordering parts and supplies</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
