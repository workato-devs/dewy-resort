/**
 * TransactionHistory Component
 * Displays a filterable list of transactions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';

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

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-600">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'charge':
        return <ArrowDownCircle className="h-4 w-4 text-blue-600" />;
      case 'refund':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (statusFilter !== 'all' && transaction.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && transaction.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <div className="flex gap-3 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="charge">Charge</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {transaction.guestName}
                        </h4>
                        {transaction.roomNumber && (
                          <Badge variant="outline" className="text-xs">
                            Room {transaction.roomNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">
                          {getTypeLabel(transaction.type)}
                        </span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{formatDateTime(transaction.createdAt)}</div>
                        {transaction.stripeTransactionId && (
                          <div className="font-mono">
                            Stripe: {transaction.stripeTransactionId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${
                      transaction.type === 'payment' 
                        ? 'text-green-600' 
                        : transaction.type === 'refund'
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}>
                      {transaction.type === 'payment' ? '+' : transaction.type === 'refund' ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
