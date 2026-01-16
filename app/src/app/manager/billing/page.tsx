'use client';

/**
 * Manager Billing Page
 * Displays billing overview for all guest accounts
 */

import { useEffect, useState, useCallback } from 'react';
import { GuestAccountsList } from '@/components/manager/GuestAccountsList';
import { RevenueChart } from '@/components/manager/RevenueChart';
import { TransactionHistory } from '@/components/manager/TransactionHistory';
import { GuestBillingDetail } from '@/components/manager/GuestBillingDetail';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GuestAccount {
  guestId: string;
  guestName: string;
  guestEmail: string;
  roomNumber: string | null;
  totalCharges: number;
  totalPaid: number;
  balance: number;
  lastTransactionDate: Date | null;
  paymentStatus: 'pending' | 'paid';
}

interface RevenueMetrics {
  totalRevenue: number;
  totalPending: number;
  totalCharges: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  collectionRate: number;
}

interface Transaction {
  id: string;
  guestId: string;
  guestName: string;
  roomNumber: string | null;
  amount: number;
  type: 'charge' | 'payment' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  stripeTransactionId: string | null;
  createdAt: Date;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface BillingData {
  apiFailures?: Array<{ source: string; error: string }>;
  guestAccounts: GuestAccount[];
  revenueMetrics: RevenueMetrics;
  recentTransactions: Transaction[];
  dailyRevenue: DailyRevenue[];
}

interface GuestDetailData {
  guest: {
    id: string;
    name: string;
    email: string;
    roomNumber: string | null;
    createdAt: Date;
  };
  charges: any[];
  transactions: any[];
  billingSummary: any;
  paymentSummary: any;
}

export default function ManagerBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [guestDetailData, setGuestDetailData] = useState<GuestDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchBillingData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/manager/billing');
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const billingData = await response.json();
      setData(billingData);

      if (isRefresh) {
        toast({
          title: 'Billing data refreshed',
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

  const fetchGuestDetail = async (guestId: string) => {
    try {
      setLoadingDetail(true);
      setSelectedGuestId(guestId);

      const response = await fetch(`/api/manager/billing/${guestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch guest billing details');
      }

      const detailData = await response.json();
      setGuestDetailData(detailData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setSelectedGuestId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleRefresh = () => {
    fetchBillingData(true);
    if (selectedGuestId) {
      fetchGuestDetail(selectedGuestId);
    }
  };

  const handleSelectGuest = (guestId: string) => {
    fetchGuestDetail(guestId);
  };

  const handleBackToOverview = () => {
    setSelectedGuestId(null);
    setGuestDetailData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Billing Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Unable to fetch billing data'}
          </p>
          <Button onClick={() => fetchBillingData()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show guest detail view
  if (selectedGuestId && guestDetailData) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackToOverview}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Guest Billing Details
            </h1>
          </div>
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

        {/* Guest Detail */}
        {loadingDetail ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading guest details...</p>
            </div>
          </div>
        ) : (
          <GuestBillingDetail
            guest={guestDetailData.guest}
            charges={guestDetailData.charges}
            transactions={guestDetailData.transactions}
            billingSummary={guestDetailData.billingSummary}
            paymentSummary={guestDetailData.paymentSummary}
          />
        )}
      </div>
    );
  }

  // Show billing overview
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing Overview</h1>
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

      {/* API Failure Banner */}
      {data.apiFailures && data.apiFailures.length > 0 && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                API Integration Issues - Using Fallback Data
              </h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {data.apiFailures.map((failure, index) => (
                  <li key={index}>
                    <span className="font-medium">{failure.source}:</span> {failure.error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Billing Grid */}
      <div className="space-y-6">
        {/* Revenue Overview */}
        <RevenueChart 
          metrics={data.revenueMetrics} 
          dailyRevenue={data.dailyRevenue}
        />

        {/* Guest Accounts and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GuestAccountsList
            accounts={data.guestAccounts}
            onSelectGuest={handleSelectGuest}
            selectedGuestId={selectedGuestId || undefined}
          />
          <TransactionHistory transactions={data.recentTransactions} />
        </div>
      </div>
    </div>
  );
}
