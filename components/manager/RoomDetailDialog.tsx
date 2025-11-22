/**
 * RoomDetailDialog Component
 * Modal dialog showing detailed room information including guest details, charges, and service requests
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Room, User, Charge, ServiceRequest, RoomDevice } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lightbulb, Thermometer, User as UserIcon, DollarSign, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoomDetailDialogProps {
  roomId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
}

interface RoomDetails {
  room: Room;
  guest: User | null;
  charges: Charge[];
  serviceRequests: ServiceRequest[];
}

export function RoomDetailDialog({ roomId, open, onOpenChange, onStatusUpdate }: RoomDetailDialogProps) {
  const [details, setDetails] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const { toast } = useToast();

  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/manager/rooms/${roomId}/guest`);
      if (!response.ok) throw new Error('Failed to fetch room details');
      
      const data = await response.json();
      setDetails(data);
      setNewStatus(data.room.status);
    } catch (error) {
      console.error('Error fetching room details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load room details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  useEffect(() => {
    if (open && roomId) {
      fetchRoomDetails();
    }
  }, [open, roomId, fetchRoomDetails]);

  const handleStatusUpdate = async () => {
    if (!roomId || !newStatus || newStatus === details?.room.status) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/manager/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update room status');

      toast({
        title: 'Success',
        description: 'Room status updated successfully',
      });

      onStatusUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating room status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update room status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!details && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room {details?.room.roomNumber} Details</DialogTitle>
          <DialogDescription>
            View and manage room information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Room Information */}
            <div className="space-y-3">
              <h3 className="font-semibold">Room Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Room Number</Label>
                  <p className="font-medium">{details.room.roomNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Floor</Label>
                  <p className="font-medium">{details.room.floor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{details.room.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Status</Label>
                  <Badge variant="outline" className="capitalize mt-1">
                    {details.room.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="space-y-3">
              <h3 className="font-semibold">Update Status</h3>
              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === details.room.status}
                >
                  {updating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>

            {/* Guest Information */}
            {details.guest ? (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Guest Information
                </h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{details.guest.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{details.guest.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Guest Information
                </h3>
                <p className="text-muted-foreground">No guest currently assigned</p>
              </div>
            )}

            {/* Charges */}
            {details.charges.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Charges ({details.charges.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {details.charges.map((charge) => (
                    <div key={charge.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">{charge.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{charge.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${charge.amount.toFixed(2)}</p>
                        <Badge variant={charge.paid ? 'default' : 'destructive'} className="text-xs">
                          {charge.paid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Requests */}
            {details.serviceRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Service Requests ({details.serviceRequests.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {details.serviceRequests.map((request) => (
                    <div key={request.id} className="p-2 bg-muted rounded space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium capitalize">{request.type.replace('_', ' ')}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{request.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {request.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
