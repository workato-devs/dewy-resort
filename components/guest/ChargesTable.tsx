/**
 * ChargesTable Component
 * Displays itemized list of charges
 */

import { Charge } from '@/types';

interface ChargesTableProps {
  charges: Charge[];
}

export function ChargesTable({ charges }: ChargesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);
  };

  const getChargeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      room: 'Room',
      service: 'Service',
      food: 'Food & Beverage',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (charges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No charges found
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 text-sm font-medium">Date</th>
            <th className="text-left p-3 text-sm font-medium">Type</th>
            <th className="text-left p-3 text-sm font-medium">Description</th>
            <th className="text-right p-3 text-sm font-medium">Amount</th>
            <th className="text-center p-3 text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge, index) => (
            <tr
              key={charge.id}
              className={index !== charges.length - 1 ? 'border-b' : ''}
            >
              <td className="p-3 text-sm text-muted-foreground">
                {formatDate(charge.date)}
              </td>
              <td className="p-3 text-sm">
                {getChargeTypeLabel(charge.type)}
              </td>
              <td className="p-3 text-sm">
                {charge.description}
              </td>
              <td className="p-3 text-sm text-right font-medium">
                {formatCurrency(charge.amount)}
              </td>
              <td className="p-3 text-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    charge.paid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {charge.paid ? 'Paid' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
