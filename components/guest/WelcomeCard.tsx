/**
 * WelcomeCard Component
 * Displays guest name and room number
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types';

interface WelcomeCardProps {
  guest: User;
  roomNumber?: string;
}

export function WelcomeCard({ guest, roomNumber }: WelcomeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {guest.name}!</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {roomNumber ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Room Number</span>
                <span className="text-2xl font-bold">{roomNumber}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We hope you enjoy your stay with us.
              </p>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Welcome to Dewy Resort! You don&apos;t have an active reservation yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact our front desk to book a room and start enjoying our services.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
