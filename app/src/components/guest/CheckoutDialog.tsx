'use client';

/**
 * CheckoutDialog Component
 * Payment form dialog for checkout process
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ProgressIndicator } from '@/components/shared/ProgressIndicator';
import { Loader2 } from 'lucide-react';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSuccess: () => void;
}

interface PaymentFormData {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
}

interface FormErrors {
  cardNumber?: string;
  cardholderName?: string;
  expiry?: string;
  cvv?: string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  amount,
  onSuccess,
}: CheckoutDialogProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    cardholderName: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const { toast } = useToast();

  const checkoutSteps = [
    { id: 'validate', label: 'Validate', description: 'Checking details' },
    { id: 'process', label: 'Process', description: 'Processing payment' },
    { id: 'confirm', label: 'Confirm', description: 'Finalizing' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '');
    if (/^\d*$/.test(value) && value.length <= 16) {
      setFormData({ ...formData, cardNumber: value });
      if (errors.cardNumber) {
        setErrors({ ...errors, cardNumber: undefined });
      }
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    
    if (value.length <= 5) {
      setFormData({ ...formData, expiry: value });
      if (errors.expiry) {
        setErrors({ ...errors, expiry: undefined });
      }
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setFormData({ ...formData, cvv: value });
      if (errors.cvv) {
        setErrors({ ...errors, cvv: undefined });
      }
    }
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cardholderName: e.target.value });
    if (errors.cardholderName) {
      setErrors({ ...errors, cardholderName: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate card number
    if (!formData.cardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (formData.cardNumber.length < 13 || formData.cardNumber.length > 19) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Validate cardholder name
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    // Validate expiry
    if (!formData.expiry) {
      newErrors.expiry = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiry)) {
      newErrors.expiry = 'Invalid format (MM/YY)';
    } else {
      const [month, year] = formData.expiry.split('/').map(Number);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiry = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiry = 'Card has expired';
      }
    }

    // Validate CVV
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);
    setProcessingStep(1);

    try {
      // Step 1: Validate
      await new Promise(resolve => setTimeout(resolve, 500));
      setProcessingStep(2);

      // Step 2: Process payment
      const response = await fetch('/api/guest/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: {
            cardNumber: formData.cardNumber,
            expiry: formData.expiry,
            cvv: formData.cvv,
            cardholderName: formData.cardholderName,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Payment failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Payment failed');
      }

      // Step 3: Confirm
      setProcessingStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Success
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        cardNumber: '',
        cardholderName: '',
        expiry: '',
        cvv: '',
      });
      setErrors({});
      setProcessingStep(1);

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'An error occurred during checkout',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Checkout</DialogTitle>
          <DialogDescription>
            Enter your payment details to complete your checkout
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Progress Indicator */}
            {processing && (
              <div className="mb-4">
                <ProgressIndicator steps={checkoutSteps} currentStep={processingStep} />
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatCurrency(amount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={formatCardNumber(formData.cardNumber)}
                onChange={handleCardNumberChange}
                disabled={processing}
                className={errors.cardNumber ? 'border-red-500' : ''}
              />
              {errors.cardNumber && (
                <p className="text-sm text-red-500">{errors.cardNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={handleCardholderNameChange}
                disabled={processing}
                className={errors.cardholderName ? 'border-red-500' : ''}
              />
              {errors.cardholderName && (
                <p className="text-sm text-red-500">{errors.cardholderName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={formData.expiry}
                  onChange={handleExpiryChange}
                  disabled={processing}
                  className={errors.expiry ? 'border-red-500' : ''}
                />
                {errors.expiry && (
                  <p className="text-sm text-red-500">{errors.expiry}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  type="password"
                  value={formData.cvv}
                  onChange={handleCvvChange}
                  disabled={processing}
                  className={errors.cvv ? 'border-red-500' : ''}
                />
                {errors.cvv && (
                  <p className="text-sm text-red-500">{errors.cvv}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(amount)}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
