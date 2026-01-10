'use client';

/**
 * Guest Room Controls Page
 * Allows guests to control IoT devices in their room
 */

import { useEffect, useState } from 'react';
import { LightControl } from '@/components/guest/LightControl';
import { ThermostatControl } from '@/components/guest/ThermostatControl';
import { DeviceStatusIndicator } from '@/components/guest/DeviceStatusIndicator';
import { RoomControlsSkeleton } from '@/components/guest/RoomControlsSkeleton';
import { FadeIn } from '@/components/shared/FadeIn';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RoomDevice } from '@/types';

interface RoomControlsData {
  devices: RoomDevice[];
  demoMode: boolean;
  roomNumber: string;
}

export default function RoomControlsPage() {
  const [data, setData] = useState<RoomControlsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controllingDevice, setControllingDevice] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDevices = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/guest/room-controls');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch room controls');
      }

      const controlsData = await response.json();
      setData(controlsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleControl = async (deviceId: string, command: string, value?: any) => {
    setControllingDevice(deviceId);
    
    // Optimistic update - immediately update UI
    const optimisticUpdate = (device: RoomDevice) => {
      const state = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;
      
      if (command === 'turn_on') {
        return { ...device, state: JSON.stringify({ ...state, state: 'on', on: true }) };
      } else if (command === 'turn_off') {
        return { ...device, state: JSON.stringify({ ...state, state: 'off', on: false }) };
      } else if (command === 'set_brightness') {
        return { ...device, state: JSON.stringify({ ...state, brightness: value }) };
      } else if (command === 'set_temperature') {
        return { ...device, state: JSON.stringify({ ...state, temperature: value, target: value }) };
      }
      return device;
    };

    // Apply optimistic update
    setData(prevData => {
      if (!prevData) return prevData;
      
      return {
        ...prevData,
        devices: prevData.devices.map(device =>
          device.id === deviceId ? optimisticUpdate(device) : device
        ),
      };
    });
    
    try {
      const response = await fetch('/api/guest/room-controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          command,
          value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to control device');
      }

      const result = await response.json();

      // Update with actual server response
      setData(prevData => {
        if (!prevData) return prevData;
        
        return {
          ...prevData,
          devices: prevData.devices.map(device =>
            device.id === deviceId ? result.device : device
          ),
        };
      });

      toast({
        title: 'Success',
        description: 'Device updated successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to control device';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Refresh devices on error to ensure state is correct
      await fetchDevices();
    } finally {
      setControllingDevice(null);
    }
  };

  const handleRefresh = () => {
    fetchDevices(true);
  };

  if (loading) {
    return <RoomControlsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold dark:text-gray-100">Unable to Load Room Controls</h2>
          <p className="text-muted-foreground">
            {error || 'Failed to load room controls. Please try again.'}
          </p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Separate devices by type
  const lights = data.devices.filter(d => d.type === 'light');
  const thermostats = data.devices.filter(d => d.type === 'thermostat');
  const otherDevices = data.devices.filter(d => d.type !== 'light' && d.type !== 'thermostat');

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Room Controls</h1>
            <p className="text-muted-foreground mt-1">
              Control devices in Room {data.roomNumber}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

      {/* Status Indicator */}
      <DeviceStatusIndicator demoMode={data.demoMode} deviceCount={data.devices.length} />

      {/* No Devices Message */}
      {data.devices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No devices available in your room.</p>
        </div>
      )}

      {/* Lights Section */}
      {lights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Lights</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lights.map(device => (
              <LightControl
                key={device.id}
                device={device}
                onControl={handleControl}
                loading={controllingDevice === device.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Thermostats Section */}
      {thermostats.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Climate Control</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {thermostats.map(device => (
              <ThermostatControl
                key={device.id}
                device={device}
                onControl={handleControl}
                loading={controllingDevice === device.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Devices Section */}
      {otherDevices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Other Devices</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherDevices.map(device => (
              <div key={device.id} className="p-4 border rounded-lg">
                <p className="font-medium">{device.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{device.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Demo Mode Notice */}
        {data.demoMode && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> You are currently in demo mode. Device controls are simulated 
              and do not affect real hardware. To connect to Home Assistant, configure the 
              HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.
            </p>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
