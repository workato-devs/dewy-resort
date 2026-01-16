/**
 * IntegrationStatusBubbles Component
 * Shows green bubbles for active integrations on the dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Cloud, Loader2, Home, CreditCard, MessageSquare } from 'lucide-react';

interface Integration {
  name: string;
  enabled: boolean;
  working: boolean;
  usingFallback: boolean;
  reason?: string;
}

interface DataSourceStatus {
  usingFallback: boolean;
  integrations: Integration[];
}

export function IntegrationStatusBubbles() {
  const [status, setStatus] = useState<DataSourceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/data-source/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch integration status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking integrations...
        </Badge>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'Salesforce':
        return <Cloud className="h-3 w-3" />;
      case 'Stripe':
        return <CreditCard className="h-3 w-3" />;
      case 'Home Assistant':
        return <Home className="h-3 w-3" />;
      case 'Twilio':
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <Cloud className="h-3 w-3" />;
    }
  };

  const activeIntegrations = status.integrations.filter(
    i => i.enabled && i.working && !i.usingFallback
  );

  if (activeIntegrations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeIntegrations.map((integration) => (
        <Badge
          key={integration.name}
          variant="default"
          className="gap-1 bg-green-600 hover:bg-green-700"
          title={`✓ ${integration.name} integration is active and working`}
        >
          {getIcon(integration.name)}
          {integration.name}
        </Badge>
      ))}
    </div>
  );
}
