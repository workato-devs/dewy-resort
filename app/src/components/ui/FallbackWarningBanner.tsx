'use client';

/**
 * Fallback Warning Banner
 * Displays a warning when the app is using fallback/mock data for any integration
 */

import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useDataSource } from '@/lib/context/DataSourceContext';
import { useState } from 'react';

export function FallbackWarningBanner() {
  const { usingFallback, integrations } = useDataSource();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Don't show if not using fallback or if dismissed
  if (!usingFallback || dismissed) {
    return null;
  }

  const fallbackIntegrations = integrations.filter(i => i.enabled && i.usingFallback);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Using Mock/Fallback Data
                </p>
                {fallbackIntegrations.length > 0 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors"
                    aria-label={expanded ? 'Hide details' : 'Show details'}
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                {fallbackIntegrations.length} integration(s) using fallback/mock data
              </p>
              
              {expanded && fallbackIntegrations.length > 0 && (
                <div className="mt-2 space-y-1">
                  {fallbackIntegrations.map((integration) => (
                    <div key={integration.name} className="text-xs text-yellow-700 dark:text-yellow-300 pl-2 border-l-2 border-yellow-300 dark:border-yellow-600">
                      <span className="font-medium">{integration.name}:</span>{' '}
                      {integration.reason || 'Using fallback data'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="ml-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
