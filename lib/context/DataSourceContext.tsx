'use client';

/**
 * Data Source Context
 * Tracks whether the app is using Salesforce or fallback (local database) data
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface IntegrationStatus {
  name: string;
  enabled: boolean;
  working: boolean;
  usingFallback: boolean;
  reason?: string;
}

interface DataSourceState {
  usingFallback: boolean;
  fallbackReason?: string;
  integrations: IntegrationStatus[];
  lastChecked?: Date;
}

interface DataSourceContextValue extends DataSourceState {
  checkDataSource: () => Promise<void>;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataSourceState>({
    usingFallback: false,
    integrations: [],
  });

  const checkDataSource = async () => {
    try {
      const response = await fetch('/api/data-source/status');
      if (response.ok) {
        const data = await response.json();
        setState({
          usingFallback: data.usingFallback,
          fallbackReason: data.fallbackReason,
          integrations: data.integrations || [],
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to check data source status:', error);
    }
  };

  useEffect(() => {
    checkDataSource();
    
    // Check every 60 seconds
    const interval = setInterval(checkDataSource, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <DataSourceContext.Provider value={{ ...state, checkDataSource }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}
