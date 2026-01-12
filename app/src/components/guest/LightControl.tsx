/**
 * Light Control Component
 * Provides on/off toggle, brightness slider, color wheel, and effects for lights
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2, Palette, Sparkles } from 'lucide-react';
import { RoomDevice } from '@/types';
import { ColorWheelPicker } from './ColorWheelPicker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LightControlProps {
  device: RoomDevice;
  onControl: (deviceId: string, command: string, value?: any) => Promise<void>;
  loading?: boolean;
}

// Predefined color presets (hue, saturation)
const COLOR_PRESETS = [
  { name: 'Warm White', hs: [30, 20], rgb: '#FFE4B5' },
  { name: 'Cool White', hs: [200, 10], rgb: '#E6F2FF' },
  { name: 'Red', hs: [0, 100], rgb: '#FF0000' },
  { name: 'Orange', hs: [30, 100], rgb: '#FF8000' },
  { name: 'Yellow', hs: [60, 100], rgb: '#FFFF00' },
  { name: 'Green', hs: [120, 100], rgb: '#00FF00' },
  { name: 'Cyan', hs: [180, 100], rgb: '#00FFFF' },
  { name: 'Blue', hs: [240, 100], rgb: '#0000FF' },
  { name: 'Purple', hs: [270, 100], rgb: '#8000FF' },
  { name: 'Pink', hs: [300, 100], rgb: '#FF00FF' },
];

// Govee light effects (actual options from select.h6022_music)
const GOVEE_EFFECTS = [
  { name: 'Energic', effect: 'Energic' },
  { name: 'Rhythm', effect: 'Rhythm' },
  { name: 'Spectrum', effect: 'Spectrum' },
  { name: 'Rolling', effect: 'Rolling' },
  { name: 'Separation', effect: 'Separation' },
  { name: 'Hopping', effect: 'Hopping' },
  { name: 'Piano Keys', effect: 'PianoKeys' },
  { name: 'Fountain', effect: 'Fountain' },
  { name: 'Day & Night', effect: 'DayAndNight' },
  { name: 'Sprouting', effect: 'Sprouting' },
  { name: 'Shiny', effect: 'Shiny' },
];

export function LightControl({ device, onControl, loading = false }: LightControlProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  
  // Parse device state
  const state = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;
  const isOn = state.state === 'on' || state.on === true;
  
  // Brightness: Home Assistant uses 0-255, we display as 0-100%
  const rawBrightness = state.brightness !== undefined ? state.brightness : 255;
  const brightnessPercent = Math.round((rawBrightness / 255) * 100);
  
  // Color: Get HS and RGB color if available
  const hsColor = state.hs_color || state.hsColor || [0, 0];
  const rgbColor = state.rgb_color || state.rgbColor;
  const currentColor = rgbColor 
    ? `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`
    : '#FFFFFF';
  
  // Current effect
  const currentEffect = state.effect || null;
  
  // Check if device supports color and effects
  const supportedColorModes = state.supported_color_modes || state.supportedColorModes || [];
  const supportsColor = supportedColorModes.includes('hs') || 
                        supportedColorModes.includes('rgb') ||
                        supportedColorModes.includes('xy');
  
  // Check if device supports effects
  const supportedFeatures = state.supported_features || 0;
  const hasEffectSupport = (supportedFeatures & 4) === 4;
  const effectList = state.effect_list || state.effectList || [];
  const hasEffectList = effectList.length > 0;
  
  // Only show effects if device explicitly supports them
  const supportsEffects = hasEffectSupport || hasEffectList;
  
  // Local state for sliders while dragging
  const [localBrightness, setLocalBrightness] = useState(brightnessPercent);
  const [localHsColor, setLocalHsColor] = useState<[number, number]>(hsColor as [number, number]);
  
  // Update local brightness when device brightness changes from server
  useEffect(() => {
    setLocalBrightness(brightnessPercent);
  }, [brightnessPercent]);
  
  // Update local color when device color changes from server
  useEffect(() => {
    setLocalHsColor(hsColor as [number, number]);
  }, [hsColor[0], hsColor[1]]);

  const handleToggle = async (checked: boolean) => {
    setLocalLoading(true);
    try {
      await onControl(device.id, checked ? 'turn_on' : 'turn_off');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBrightnessChange = (value: number[]) => {
    setLocalBrightness(value[0]);
  };

  const handleBrightnessCommit = async (value: number[]) => {
    if (!isOn) return;
    
    setLocalLoading(true);
    try {
      // Convert percentage (0-100) to Home Assistant scale (0-255)
      const brightness255 = Math.round((value[0] / 100) * 255);
      await onControl(device.id, 'set_brightness', brightness255);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleColorSelect = async (hs: number[]) => {
    if (!isOn) {
      // Turn on first if off
      await handleToggle(true);
    }
    
    setLocalLoading(true);
    try {
      await onControl(device.id, 'set_color', { hs_color: hs });
    } finally {
      setLocalLoading(false);
    }
  };
  
  const handleColorWheelChange = (hs: [number, number]) => {
    setLocalHsColor(hs);
  };
  
  const handleColorWheelCommit = async () => {
    await handleColorSelect(localHsColor);
  };
  
  const handleEffectSelect = async (effectName: string) => {
    if (!isOn) {
      // Turn on first if off
      await handleToggle(true);
    }
    
    setLocalLoading(true);
    try {
      await onControl(device.id, 'set_effect', { effect: effectName });
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb 
            className={`h-5 w-5 ${isOn ? 'text-yellow-500' : 'text-gray-400'}`}
            style={isOn && rgbColor ? { color: currentColor } : undefined}
          />
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

        {/* Brightness Slider - Always show when on */}
        {isOn && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`brightness-${device.id}`} className="text-sm font-medium">
                Brightness
              </Label>
              <span className="text-sm text-muted-foreground" aria-live="polite">
                {localBrightness}%
              </span>
            </div>
            <Slider
              id={`brightness-${device.id}`}
              min={1}
              max={100}
              step={1}
              value={[localBrightness]}
              onValueChange={handleBrightnessChange}
              onValueCommit={handleBrightnessCommit}
              disabled={isLoading}
              className="w-full"
              aria-label={`Adjust brightness for ${device.name}`}
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={localBrightness}
            />
          </div>
        )}

        {/* Color Controls - Show if device supports color */}
        {isOn && supportsColor && (
          <div className="space-y-3">
            {/* Quick Color Presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <Label className="text-sm font-medium">Quick Colors</Label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleColorSelect(preset.hs)}
                    disabled={isLoading}
                    className="aspect-square rounded-md border-2 border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: preset.rgb }}
                    title={preset.name}
                    aria-label={`Set color to ${preset.name}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Color Wheel Picker */}
            <Collapsible open={showColorWheel} onOpenChange={setShowColorWheel}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Palette className="h-4 w-4 mr-2" />
                  {showColorWheel ? 'Hide' : 'Show'} Color Wheel
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="flex flex-col items-center gap-3">
                  <ColorWheelPicker
                    value={localHsColor}
                    onChange={handleColorWheelChange}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleColorWheelCommit}
                    disabled={isLoading}
                    size="sm"
                    className="w-full"
                  >
                    Apply Color
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        
        {/* Effects - Show if device supports effects */}
        {isOn && supportsEffects && (
          <Collapsible open={showEffects} onOpenChange={setShowEffects}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                {showEffects ? 'Hide' : 'Show'} Effects
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2">
                {GOVEE_EFFECTS.map((effect) => (
                  <Button
                    key={effect.effect}
                    onClick={() => handleEffectSelect(effect.effect)}
                    disabled={isLoading}
                    variant={currentEffect === effect.effect ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                  >
                    {effect.name}
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Status */}
        <div className="text-xs text-muted-foreground">
          Status: {isOn ? 'On' : 'Off'}
          {isOn && ` • ${localBrightness}% brightness`}
          {isOn && rgbColor && ` • RGB(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`}
          {isOn && currentEffect && ` • Effect: ${currentEffect}`}
        </div>
      </CardContent>
    </Card>
  );
}
