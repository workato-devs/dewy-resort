/**
 * QuickActionsCard Component
 * Provides quick action buttons for common services
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActionsCard() {
  const router = useRouter();

  const handleServiceClick = () => {
    router.push('/guest/services');
  };

  const handleBillingClick = () => {
    router.push('/guest/billing');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={handleServiceClick}
            aria-label="Request housekeeping service"
          >
            <span className="text-2xl" aria-hidden="true">🧹</span>
            <span className="text-sm">Housekeeping</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={handleServiceClick}
            aria-label="Request room service"
          >
            <span className="text-2xl" aria-hidden="true">🍽️</span>
            <span className="text-sm">Room Service</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={handleServiceClick}
            aria-label="Request maintenance service"
          >
            <span className="text-2xl" aria-hidden="true">🔧</span>
            <span className="text-sm">Maintenance</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={handleBillingClick}
            aria-label="View billing information"
          >
            <span className="text-2xl" aria-hidden="true">💳</span>
            <span className="text-sm">View Bill</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
