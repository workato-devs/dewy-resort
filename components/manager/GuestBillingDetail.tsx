/**
 * GuestBillingDetail Component
 * Displays detailed billing information for a selected guest
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Receipt, CreditCard, DollarSign } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email: string;
  roomNumber: string | null;
  createdAt: Date;
}

interface Charge {
  id: string;
  guestId: string;
  type: 'room' | 'service' | 'food' | 'other';
  description: string;
  amount: number;
  date: Date;
  paid: boolean;
}

interface Transaction {
  id: string;
  guestId: string;
  amount: number;
  type: 'charge' | 'payment' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  stripeTransactionId: string | null;
  createdAt: Date;
}

interface BillingSummary {
  totalCharges: number;
  totalPaid: number;
  balance: number;
  chargesByType: {
    room: number;
    service: number;
    food: number;
    other: number;
  };
}

interface PaymentSummary {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

interface GuestBillingDetailProps {
  guest: Guest;
  charges: Charge[];
  transactions: Transaction[];
  billingSummary: BillingSummary;
  paymentSummary: PaymentSummary;
}

export function GuestBillingDetail({
  guest,
  charges,
  transactions,
  billingSummary,
  paymentSummary,
}: GuestBillingDetailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getChargeTypeBadge = (type: string) => {
    const colors = {
      room: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      service: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      food: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      other: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
    };
    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 dark:bg-green-700">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 dark:bg-yellow-700">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Guest Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
              <span className="font-semibold">{guest.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
              <span className="font-semibold">{guest.email}</span>
            </div>
            {guest.roomNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Room:</span>
                <Badge variant="outline">Room {guest.roomNumber}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Check-in:</span>
              <span className="font-semibold">{formatDate(guest.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Charges</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(billingSummary.totalCharges)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(billingSummary.totalPaid)}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Balance Due</div>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(billingSummary.balance)}
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Charges by Type
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Room:</span>
                  <span className="font-semibold">
                    {formatCurrency(billingSummary.chargesByType.room)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Service:</span>
                  <span className="font-semibold">
                    {formatCurrency(billingSummary.chargesByType.service)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Food:</span>
                  <span className="font-semibold">
                    {formatCurrency(billingSummary.chargesByType.food)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Other:</span>
                  <span className="font-semibold">
                    {formatCurrency(billingSummary.chargesByType.other)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Itemized Charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {charges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No charges found
              </div>
            ) : (
              charges.map((charge) => (
                <div
                  key={charge.id}
                  className="p-3 rounded-lg border flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getChargeTypeBadge(charge.type)}
                      {charge.paid && (
                        <Badge className="bg-green-600 text-xs">Paid</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {charge.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(charge.date)}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(charge.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 pb-4 border-b">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {paymentSummary.completedPayments > 0 
                    ? formatCurrency(paymentSummary.completedPayments)
                    : '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {paymentSummary.pendingPayments > 0
                    ? formatCurrency(paymentSummary.pendingPayments)
                    : '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {paymentSummary.failedPayments > 0
                    ? formatCurrency(paymentSummary.failedPayments)
                    : '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Failed</div>
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-3 rounded-lg border flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{formatDateTime(transaction.createdAt)}</div>
                        {transaction.stripeTransactionId && (
                          <div className="font-mono">
                            {transaction.stripeTransactionId}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-lg font-bold ${
                        transaction.type === 'payment' 
                          ? 'text-green-600' 
                          : 'text-gray-900'
                      }`}>
                        {transaction.type === 'payment' ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
