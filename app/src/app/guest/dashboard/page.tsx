'use client';

/**
 * Guest Dashboard Page
 * Main landing page for guests after login
 */

import { useEffect, useState } from 'react';
import { WelcomeCard } from '@/components/guest/WelcomeCard';
import { RoomInfoCard } from '@/components/guest/RoomInfoCard';
import { CurrentChargesCard } from '@/components/guest/CurrentChargesCard';
import { QuickActionsCard } from '@/components/guest/QuickActionsCard';
import { ActiveRequestsCard } from '@/components/guest/ActiveRequestsCard';
import { DashboardSkeleton } from '@/components/guest/DashboardSkeleton';
import { FadeIn } from '@/components/shared/FadeIn';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, Room, Charge, ServiceRequest } from '@/types';

interface DashboardData {
  guest: User;
  room: Room | null;
  charges: {
    items: Charge[];
    total: number;
    unpaidTotal: number;
  };
  activeRequests: ServiceRequest[];
}

export default function GuestDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/guest/dashboard');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      
      // Convert date strings to Date objects
      dashboardData.guest.createdAt = new Date(dashboardData.guest.createdAt);
      dashboardData.charges.items = dashboardData.charges.items.map((charge: any) => ({
        ...charge,
        date: new Date(charge.date),
      }));
      dashboardData.activeRequests = dashboardData.activeRequests.map((request: any) => ({
        ...request,
        createdAt: new Date(request.createdAt),
        completedAt: request.completedAt ? new Date(request.completedAt) : undefined,
      }));

      setData(dashboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
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
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold dark:text-gray-100">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground">
            {error || 'Failed to load dashboard data. Please try again.'}
          </p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card - Full width on mobile, spans 2 cols on larger screens */}
          <div className="md:col-span-2">
            <WelcomeCard guest={data.guest} roomNumber={data.room?.roomNumber} />
          </div>

          {/* Room Info Card - Only show if guest has a room */}
          {data.room ? (
            <div>
              <RoomInfoCard room={data.room} />
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/50">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">No Active Reservation</p>
                <p className="text-xs text-muted-foreground">
                  Book a room to access room controls and services
                </p>
              </div>
            </div>
          )}

          {/* Current Charges Card */}
          <div>
            <CurrentChargesCard charges={data.charges} />
          </div>

          {/* Quick Actions Card */}
          <div>
            <QuickActionsCard />
          </div>

          {/* Active Requests Card - Spans remaining space */}
          <div className="md:col-span-2 lg:col-span-1">
            <ActiveRequestsCard requests={data.activeRequests} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
