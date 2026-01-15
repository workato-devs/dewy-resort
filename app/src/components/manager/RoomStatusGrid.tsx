/**
 * RoomStatusGrid Component
 * Displays visual grid of all room statuses
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DoorOpen, DoorClosed, Sparkles, Wrench } from 'lucide-react';
import { Room } from '@/types';

interface RoomStatusGridProps {
  rooms: (Room & { guestName?: string | null })[];
}

export function RoomStatusGrid({ rooms }: RoomStatusGridProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'occupied':
        return {
          color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-300',
          icon: DoorClosed,
          label: 'Occupied',
        };
      case 'vacant':
        return {
          color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-300',
          icon: DoorOpen,
          label: 'Vacant',
        };
      case 'cleaning':
        return {
          color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-300',
          icon: Sparkles,
          label: 'Cleaning',
        };
      case 'maintenance':
        return {
          color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-300',
          icon: Wrench,
          label: 'Maintenance',
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300',
          icon: DoorOpen,
          label: 'Unknown',
        };
    }
  };

  const getRoomTypeLabel = (type: string | undefined | null) => {
    if (!type) {
      return 'N/A';
    }
    
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'standard':
        return 'STD';
      case 'deluxe':
        return 'DLX';
      case 'suite':
        return 'STE';
      default:
        return type.toUpperCase().slice(0, 3);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {rooms.map((room) => {
            const statusConfig = getStatusConfig(room.status);
            const Icon = statusConfig.icon;
            
            return (
              <div
                key={room.id}
                className={`p-3 rounded-lg border-2 ${statusConfig.color} hover:shadow-md transition-shadow cursor-pointer`}
                title={`Room ${room.roomNumber} - ${statusConfig.label}${room.guestName ? ` - ${room.guestName}` : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon className="h-4 w-4" />
                  <div className="font-bold text-sm">{room.roomNumber}</div>
                  <div className="text-xs opacity-75">
                    {getRoomTypeLabel(room.type)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status Legend</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['occupied', 'vacant', 'cleaning', 'maintenance'].map((status) => {
              const config = getStatusConfig(status);
              const Icon = config.icon;
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${config.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
