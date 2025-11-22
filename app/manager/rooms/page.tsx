/**
 * Manager Rooms Page
 * Displays and manages all hotel rooms
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoomManagementGrid } from '@/components/manager/RoomManagementGrid';
import { RoomsSkeleton } from '@/components/manager/RoomsSkeleton';
import { useToast } from '@/hooks/use-toast';
import { Room, User, RoomDevice } from '@/types';

interface RoomWithDetails extends Room {
  guest: User | null;
  devices: RoomDevice[];
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/manager/rooms');
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/manager/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update room status');
      }

      toast({
        title: 'Success',
        description: 'Room status updated successfully',
      });

      // Refresh rooms list
      fetchRooms();
    } catch (error) {
      console.error('Error updating room status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update room status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <RoomsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Room Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage all hotel rooms, guest information, and room statuses
        </p>
      </div>

      <RoomManagementGrid
        rooms={rooms}
        onStatusChange={handleStatusChange}
        onRefresh={fetchRooms}
      />
    </div>
  );
}
