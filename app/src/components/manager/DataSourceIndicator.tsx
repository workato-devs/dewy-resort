/**
 * DataSourceIndicator Component
 * Shows whether data is coming from Salesforce or local database
 */

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, Cloud, AlertCircle, Loader2 } from 'lucide-react';

interface DataSourceStatus {
  usingFallback: boolean;
  integrations: Array<{
    name: string;
    enabled: boolean;
    working: boolean;
    usingFallback: boolean;
    reason?: string;
  }>;
}

export function DataSourceIndicator() {
  const [status, setStatus] = useState<DataSourceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/data-source/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch data source status:', error);
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
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!status) {
    return null;
  }

  const salesforce = status.integrations.find(i => i.name === 'Salesforce');
  
  if (!salesforce?.enabled) {
    return (
      <Badge 
        variant="secondary" 
        className="gap-1"
        title="Using local SQLite database - Salesforce integration is disabled"
      >
        <Database className="h-3 w-3" />
        Local Database
      </Badge>
    );
  }

  if (salesforce.working && !salesforce.usingFallback) {
    return (
      <Badge 
        variant="default" 
        className="gap-1 bg-green-600 hover:bg-green-700"
        title="✓ Connected to Salesforce - Data is synced via Workato API - Room IDs start with 'a01'"
      >
        <Cloud className="h-3 w-3" />
        Salesforce (Live)
      </Badge>
    );
  }

  return (
    <Badge 
      variant="destructive" 
      className="gap-1"
      title={`Using local database fallback - ${salesforce.reason || 'Salesforce connection failed'}`}
    >
      <AlertCircle className="h-3 w-3" />
      Fallback Mode
    </Badge>
  );
}
