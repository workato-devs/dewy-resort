/**
 * StatusLegend Component
 * Displays a legend explaining room status colors
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, User, Clock, Wrench } from 'lucide-react';

export function StatusLegend() {
  const statuses = [
    {
      name: 'Vacant',
      color: 'bg-green-500',
      icon: <CheckCircle2 className="h-4 w-4" />,
      description: 'Room is available for check-in',
    },
    {
      name: 'Occupied',
      color: 'bg-blue-500',
      icon: <User className="h-4 w-4" />,
      description: 'Guest is currently staying',
    },
    {
      name: 'Cleaning',
      color: 'bg-yellow-500',
      icon: <Clock className="h-4 w-4" />,
      description: 'Room is being cleaned',
    },
    {
      name: 'Maintenance',
      color: 'bg-red-500',
      icon: <Wrench className="h-4 w-4" />,
      description: 'Room requires maintenance',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Status Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statuses.map((status) => (
          <div key={status.name} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status.color}`} />
            <div className="flex items-center gap-2 flex-1">
              {status.icon}
              <div>
                <p className="text-sm font-medium">{status.name}</p>
                <p className="text-xs text-muted-foreground">{status.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
