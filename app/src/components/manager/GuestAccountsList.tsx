/**
 * GuestAccountsList Component
 * Displays a list of all guest accounts with their billing information
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, DollarSign } from 'lucide-react';
import { useState } from 'react';

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

interface GuestAccountsListProps {
  accounts: GuestAccount[];
  onSelectGuest: (guestId: string) => void;
  selectedGuestId?: string;
}

export function GuestAccountsList({ 
  accounts, 
  onSelectGuest,
  selectedGuestId 
}: GuestAccountsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'No transactions';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredAccounts = accounts.filter(account => 
    account.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.guestEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.roomNumber?.includes(searchTerm)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Guest Accounts
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, email, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No guest accounts found
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div
                key={account.guestId}
                onClick={() => onSelectGuest(account.guestId)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedGuestId === account.guestId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {account.guestName}
                      </h3>
                      {account.roomNumber && (
                        <Badge variant="outline" className="text-xs">
                          Room {account.roomNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {account.guestEmail}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Last transaction: {formatDate(account.lastTransactionDate)}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      {account.paymentStatus === 'pending' ? (
                        <Badge variant="destructive" className="text-xs">
                          Balance Due
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                          Paid
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total: {formatCurrency(account.totalCharges)}
                      </div>
                      {account.balance > 0 && (
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(account.balance)}
                        </div>
                      )}
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
