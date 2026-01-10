/**
 * RevenueChart Component
 * Displays revenue metrics and daily revenue visualization
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface RevenueMetrics {
  totalRevenue: number;
  totalPending: number;
  totalCharges: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  collectionRate: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  metrics: RevenueMetrics;
  dailyRevenue: DailyRevenue[];
}

export function RevenueChart({ metrics, dailyRevenue }: RevenueChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate max revenue for bar chart scaling
  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: `${metrics.completedPayments} completed payments`,
    },
    {
      label: 'Pending Charges',
      value: formatCurrency(metrics.totalPending),
      icon: AlertCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      description: `${metrics.pendingPayments} pending payments`,
    },
    {
      label: 'Collection Rate',
      value: `${metrics.collectionRate}%`,
      icon: CheckCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Of total charges collected',
    },
    {
      label: 'Total Charges',
      value: formatCurrency(metrics.totalCharges),
      icon: CreditCard,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'All guest charges',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="p-4 rounded-lg border bg-white dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {card.value}
                    </div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {card.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {card.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily Revenue Chart */}
          {dailyRevenue.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Daily Revenue (Last 7 Days)
              </h4>
              <div className="space-y-2">
                {dailyRevenue.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                      {formatDate(day.date)}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full flex items-center justify-end pr-3 transition-all"
                        style={{
                          width: `${(day.revenue / maxRevenue) * 100}%`,
                          minWidth: day.revenue > 0 ? '60px' : '0',
                        }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Status Summary */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Payment Status
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {metrics.completedPayments}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {metrics.pendingPayments}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics.failedPayments}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Failed</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
