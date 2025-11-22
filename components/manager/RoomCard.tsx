/**
 * RoomCard Component
 * Displays individual room information with status, guest info, and actions
 */

'use client';

import { Room, User, RoomDevice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User as UserIcon, 
  Lightbulb, 
  Thermometer, 
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  guest: User | null;
  devices: RoomDevice[];
  onStatusChange: (roomId: string, newStatus: string) => void;
  onViewDetails: (roomId: string) => void;
}

export function RoomCard({ room, guest, devices, onStatusChange, onViewDetails }: RoomCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-blue-500';
      case 'cleaning':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vacant':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'occupied':
        return <UserIcon className="h-4 w-4" />;
      case 'cleaning':
        return <Clock className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'vacant':
        return 'default';
      case 'occupied':
        return 'secondary';
      case 'cleaning':
        return 'outline';
      case 'maintenance':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const lightDevice = devices.find(d => d.type === 'light');
  const thermostatDevice = devices.find(d => d.type === 'thermostat');

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Room {room.roomNumber}</CardTitle>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(room.status)}`} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={getStatusBadgeVariant(room.status)} className="flex items-center gap-1">
            {getStatusIcon(room.status)}
            <span className="capitalize">{room.status}</span>
          </Badge>
          <Badge variant="outline" className="capitalize">
            {room.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Guest Information */}
        {guest ? (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{guest.name}</p>
              <p className="text-xs text-muted-foreground">{guest.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No guest</p>
          </div>
        )}

        {/* Device Status */}
        <div className="flex gap-2">
          {lightDevice && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              <span>{JSON.parse(lightDevice.state).state === 'on' ? 'On' : 'Off'}</span>
            </div>
          )}
          {thermostatDevice && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Thermometer className="h-3 w-3" />
              <span>{JSON.parse(thermostatDevice.state).temperature}°F</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(room.id)}
          >
            <Info className="h-3 w-3 mr-1" />
            Details
          </Button>
          {room.status !== 'vacant' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(room.id, 'vacant')}
            >
              Mark Vacant
            </Button>
          )}
        </div>

        {/* Quick Status Changes */}
        {room.status === 'vacant' && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onStatusChange(room.id, 'cleaning')}
            >
              Cleaning
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onStatusChange(room.id, 'maintenance')}
            >
              Maintenance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
