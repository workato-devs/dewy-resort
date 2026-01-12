/**
 * Thermostat Control Component
 * Provides temperature adjustment controls
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Thermometer, Plus, Minus, Loader2, Flame, Snowflake } from 'lucide-react';
import { RoomDevice } from '@/types';

interface ThermostatControlProps {
  device: RoomDevice;
  onControl: (deviceId: string, command: string, value?: any) => Promise<void>;
  loading?: boolean;
}

export function ThermostatControl({ device, onControl, loading = false }: ThermostatControlProps) {
  const [localLoading, setLocalLoading] = useState(false);
  
  // Parse device state
  const state = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;
  const temperature = state.temperature || state.target || 72;
  const currentTemp = state.current_temperature || temperature - 1;
  const mode = state.mode || 'heat';

  const handleTemperatureChange = async (delta: number) => {
    const newTemp = temperature + delta;
    if (newTemp < 60 || newTemp > 85) return; // Temperature limits
    
    setLocalLoading(true);
    try {
      await onControl(device.id, 'set_temperature', newTemp);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleModeChange = async (newMode: string) => {
    setLocalLoading(true);
    try {
      await onControl(device.id, 'set_hvac_mode', newMode);
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Thermometer className="h-5 w-5 text-blue-500" />
          {device.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Temperature Display */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-primary">{temperature}°F</div>
          <div className="text-sm text-muted-foreground mt-1">
            Current: {currentTemp}°F
          </div>
        </div>

        {/* Temperature Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleTemperatureChange(-1)}
            disabled={isLoading || temperature <= 60}
            className="h-12 w-12"
            aria-label="Decrease temperature"
          >
            <Minus className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col items-center min-w-[100px]">
            <Label className="text-sm font-medium mb-1">Set Temperature</Label>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleTemperatureChange(1)}
            disabled={isLoading || temperature >= 85}
            className="h-12 w-12"
            aria-label="Increase temperature"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === 'heat' ? 'default' : 'outline'}
              onClick={() => handleModeChange('heat')}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Flame className="h-4 w-4" />
              Heat
            </Button>
            <Button
              variant={mode === 'cool' ? 'default' : 'outline'}
              onClick={() => handleModeChange('cool')}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Snowflake className="h-4 w-4" />
              Cool
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="text-xs text-muted-foreground">
          Range: 60°F - 85°F
        </div>
      </CardContent>
    </Card>
  );
}
