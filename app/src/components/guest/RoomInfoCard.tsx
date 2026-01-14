/**
 * RoomInfoCard Component
 * Displays room details
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Room } from '@/types';

interface RoomInfoCardProps {
  room: Room;
}

export function RoomInfoCard({ room }: RoomInfoCardProps) {
  const roomTypeLabels = {
    standard: 'Standard Room',
    deluxe: 'Deluxe Room',
    suite: 'Suite',
  };

  const statusLabels = {
    vacant: 'Vacant',
    occupied: 'Occupied',
    cleaning: 'Being Cleaned',
    maintenance: 'Under Maintenance',
  };

  const statusColors = {
    vacant: 'text-gray-600',
    occupied: 'text-green-600',
    cleaning: 'text-yellow-600',
    maintenance: 'text-red-600',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Room Type</span>
            <span className="font-medium">{roomTypeLabels[room.type]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Floor</span>
            <span className="font-medium">{room.floor}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`font-medium ${statusColors[room.status]}`}>
              {statusLabels[room.status]}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
