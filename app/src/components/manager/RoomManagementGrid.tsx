/**
 * RoomManagementGrid Component
 * Grid layout displaying all rooms with filtering and management capabilities
 */

'use client';

import { useState } from 'react';
import { Room, User, RoomDevice, RoomStatus } from '@/types';
import { RoomCard } from './RoomCard';
import { StatusLegend } from './StatusLegend';
import { RoomDetailDialog } from './RoomDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

interface RoomWithDetails extends Room {
  guest: User | null;
  devices: RoomDevice[];
}

interface RoomManagementGridProps {
  rooms: RoomWithDetails[];
  onStatusChange: (roomId: string, newStatus: string) => void;
  onRefresh: () => void;
}

export function RoomManagementGrid({ rooms, onStatusChange, onRefresh }: RoomManagementGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (roomId: string) => {
    setSelectedRoomId(roomId);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedRoomId(null);
  };

  const handleStatusUpdate = () => {
    onRefresh();
  };

  // Filter rooms based on search and status
  const filteredRooms = rooms.filter((room) => {
    // If no search query, show all rooms (don't filter by search)
    const matchesSearch = !searchQuery || 
      (room.roomNumber && room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.guest?.name && room.guest.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.guest?.email && room.guest.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group rooms by status for statistics
  const statusCounts = rooms.reduce((acc, room) => {
    acc[room.status] = (acc[room.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Vacant</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statusCounts.vacant || 0}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Occupied</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{statusCounts.occupied || 0}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Cleaning</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusCounts.cleaning || 0}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Maintenance</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{statusCounts.maintenance || 0}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by room number, guest name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRooms.length} of {rooms.length} rooms
        </p>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            guest={room.guest}
            devices={room.devices}
            onStatusChange={onStatusChange}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No rooms found matching your criteria</p>
        </div>
      )}

      {/* Status Legend */}
      <div className="max-w-md">
        <StatusLegend />
      </div>

      {/* Room Details Dialog */}
      <RoomDetailDialog
        roomId={selectedRoomId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
