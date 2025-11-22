/**
 * Light Control Component
 * Provides on/off toggle and brightness slider for lights
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Lightbulb, Loader2 } from 'lucide-react';
import { RoomDevice } from '@/types';

interface LightControlProps {
  device: RoomDevice;
  onControl: (deviceId: string, command: string, value?: any) => Promise<void>;
  loading?: boolean;
}

export function LightControl({ device, onControl, loading = false }: LightControlProps) {
  const [localLoading, setLocalLoading] = useState(false);
  
  // Parse device state
  const state = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;
  const isOn = state.state === 'on' || state.on === true;
  const brightness = state.brightness || 100;
  
  // Local state for slider while dragging
  const [localBrightness, setLocalBrightness] = useState(brightness);
  
  // Update local brightness when device brightness changes from server
  useEffect(() => {
    setLocalBrightness(brightness);
  }, [brightness]);

  const handleToggle = async (checked: boolean) => {
    setLocalLoading(true);
    try {
      await onControl(device.id, checked ? 'turn_on' : 'turn_off');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBrightnessChange = (value: number[]) => {
    if (!isOn) return; // Don't adjust brightness when off
    setLocalBrightness(value[0]);
  };

  const handleBrightnessCommit = async (value: number[]) => {
    if (!isOn) return; // Don't adjust brightness when off
    
    setLocalLoading(true);
    try {
      await onControl(device.id, 'set_brightness', value[0]);
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className={`h-5 w-5 ${isOn ? 'text-yellow-500' : 'text-gray-400'}`} />
          {device.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* On/Off Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor={`light-${device.id}`} className="text-sm font-medium">
            Power
          </Label>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />}
            <Switch
              id={`light-${device.id}`}
              checked={isOn}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              aria-label={`Turn ${device.name} ${isOn ? 'off' : 'on'}`}
            />
          </div>
        </div>

        {/* Brightness Slider */}
        {isOn && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`brightness-${device.id}`} className="text-sm font-medium">
                Brightness
              </Label>
              <span className="text-sm text-muted-foreground" aria-live="polite">{localBrightness}%</span>
            </div>
            <Slider
              id={`brightness-${device.id}`}
              min={0}
              max={100}
              step={1}
              value={[localBrightness]}
              onValueChange={handleBrightnessChange}
              onValueCommit={handleBrightnessCommit}
              disabled={isLoading}
              className="w-full"
              aria-label={`Adjust brightness for ${device.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={localBrightness}
            />
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-muted-foreground">
          Status: {isOn ? 'On' : 'Off'}
          {isOn && ` • ${localBrightness}% brightness`}
        </div>
      </CardContent>
    </Card>
  );
}
