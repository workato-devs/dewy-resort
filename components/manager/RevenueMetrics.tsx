/**
 * RevenueMetrics Component
 * Displays financial summary and revenue metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CreditCard, Clock } from 'lucide-react';

interface RevenueData {
  totalRevenue: number;
  pendingCharges: number;
  completedTransactions: number;
  todayRevenue: number;
}

interface RevenueMetricsProps {
  data: RevenueData;
}

export function RevenueMetrics({ data }: RevenueMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const metrics = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'All completed payments',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(data.todayRevenue),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Revenue from today',
    },
    {
      label: 'Pending Charges',
      value: formatCurrency(data.pendingCharges),
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      description: 'Unpaid guest charges',
    },
    {
      label: 'Transactions',
      value: data.completedTransactions.toString(),
      icon: CreditCard,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Completed payments',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Revenue Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="p-4 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {metric.value}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {metric.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
