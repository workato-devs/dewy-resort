/**
 * TotalSummary Component
 * Displays billing totals with subtotal, tax, and total
 */

interface TotalSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
}

export function TotalSummary({ subtotal, tax, total }: TotalSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-6 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Tax (10%)</span>
        <span className="text-sm font-medium">{formatCurrency(tax)}</span>
      </div>
      <div className="border-t pt-3">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
