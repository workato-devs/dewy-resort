'use client';

/**
 * Guest Billing Page
 * Displays itemized charges and checkout functionality
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChargesTable } from '@/components/guest/ChargesTable';
import { TotalSummary } from '@/components/guest/TotalSummary';
import { CheckoutDialog } from '@/components/guest/CheckoutDialog';
import { BillingSkeleton } from '@/components/guest/BillingSkeleton';
import { useToast } from '@/hooks/use-toast';
import { Charge, User } from '@/types';

interface BillingData {
  guest: User;
  charges: Charge[];
  subtotal: number;
  tax: number;
  total: number;
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/guest/billing');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch billing data');
      }

      const data = await response.json();
      setBillingData(data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load billing information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckoutSuccess = () => {
    toast({
      title: 'Checkout Successful',
      description: 'Thank you for your stay! Your payment has been processed.',
    });
    
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (loading) {
    return <BillingSkeleton />;
  }

  if (!billingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">No billing data available</p>
        </div>
      </div>
    );
  }

  const hasUnpaidCharges = billingData.charges.some(charge => !charge.paid);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Billing & Checkout</h1>
        <p className="text-muted-foreground">
          Review your charges and complete checkout
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Itemized Charges</CardTitle>
              <CardDescription>
                All charges during your stay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChargesTable charges={billingData.charges} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <TotalSummary
                subtotal={billingData.subtotal}
                tax={billingData.tax}
                total={billingData.total}
              />
              
              <div className="mt-6">
                {hasUnpaidCharges ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setCheckoutDialogOpen(true)}
                  >
                    Proceed to Checkout
                  </Button>
                ) : (
                  <div className="text-center p-4 bg-green-50 text-green-800 rounded-lg">
                    <p className="font-medium">All charges paid</p>
                    <p className="text-sm mt-1">Thank you for your stay!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{billingData.guest.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Room Number</p>
                <p className="font-medium">{billingData.guest.roomNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{billingData.guest.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        amount={billingData.total}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
