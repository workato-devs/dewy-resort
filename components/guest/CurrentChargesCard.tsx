/**
 * CurrentChargesCard Component
 * Displays billing summary with total charges
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Charge } from '@/types';

interface CurrentChargesCardProps {
  charges: {
    items: Charge[];
    total: number;
    unpaidTotal: number;
  };
}

export function CurrentChargesCard({ charges }: CurrentChargesCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Charges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Charges</span>
              <span className="font-medium">{formatCurrency(charges.total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unpaid Balance</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(charges.unpaidTotal)}
              </span>
            </div>
          </div>
          
          {charges.items.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Recent Charges</p>
              <div className="space-y-1">
                {charges.items.slice(0, 3).map((charge) => (
                  <div key={charge.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate">
                      {charge.description}
                    </span>
                    <span className="font-medium ml-2">
                      {formatCurrency(charge.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
