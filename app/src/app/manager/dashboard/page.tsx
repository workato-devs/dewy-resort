'use client';

/**
 * Manager Dashboard Page
 * Main landing page for managers after login
 */

import { useEffect, useState, useCallback } from 'react';
import { OccupancyOverview } from '@/components/manager/OccupancyOverview';
import { PendingTasksCard } from '@/components/manager/PendingTasksCard';
import { ServiceRequestsCard } from '@/components/manager/ServiceRequestsCard';
import { RoomStatusGrid } from '@/components/manager/RoomStatusGrid';
import { RevenueMetrics } from '@/components/manager/RevenueMetrics';
import { ContactSearchCard } from '@/components/manager/ContactSearchCard';
import { ManagerDashboardSkeleton } from '@/components/manager/ManagerDashboardSkeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  apiFailures?: Array<{ source: string; error: string }>;
  occupancy: {
    totalRooms: number;
    occupied: number;
    vacant: number;
    cleaning: number;
    maintenance: number;
    occupancyRate: number;
  };
  pendingTasks: any[];
  serviceRequests: any[];
  roomStatuses: any[];
  revenue: {
    totalRevenue: number;
    pendingCharges: number;
    completedTransactions: number;
    todayRevenue: number;
  };
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/manager/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);

      if (isRefresh) {
        toast({
          title: 'Dashboard refreshed',
          description: 'Data has been updated successfully',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return <ManagerDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Unable to fetch dashboard data'}
          </p>
          <Button onClick={() => fetchDashboardData()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manager Dashboard</h1>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* API Failure Banner - Only shown if SHOW_FALLBACK_ERRORS is enabled */}
      {process.env.NEXT_PUBLIC_SHOW_FALLBACK_ERRORS === 'true' && data.apiFailures && data.apiFailures.length > 0 && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Using Mock/Fallback Data
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                Some data sources are unavailable. Displaying local fallback data instead.
              </p>
              <div className="space-y-1">
                {data.apiFailures.map((failure, index) => (
                  <div key={index} className="text-xs text-yellow-600 dark:text-yellow-300 font-mono bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 py-1">
                    <span className="font-semibold">{failure.source}:</span> {failure.error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="space-y-6">
        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OccupancyOverview data={data.occupancy} />
          <RevenueMetrics data={data.revenue} />
        </div>

        {/* Middle Row - Tasks and Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PendingTasksCard tasks={data.pendingTasks} />
          <ServiceRequestsCard requests={data.serviceRequests} />
        </div>

        {/* Contact Search */}
        <ContactSearchCard />

        {/* Bottom Row - Room Status Grid */}
        <RoomStatusGrid rooms={data.roomStatuses} />
      </div>
    </div>
  );
}
