/**
 * Device Status Indicator Component
 * Shows connection status and demo mode indicator
 */

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface DeviceStatusIndicatorProps {
  demoMode: boolean;
  deviceCount: number;
}

export function DeviceStatusIndicator({ demoMode, deviceCount }: DeviceStatusIndicatorProps) {
  if (!demoMode) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="flex items-center gap-3 py-3">
          <Wifi className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              Connected to Home Assistant
            </p>
            <p className="text-xs text-green-700">
              {deviceCount} {deviceCount === 1 ? 'device' : 'devices'} available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="flex items-center gap-3 py-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            Demo Mode Active
          </p>
          <p className="text-xs text-amber-700">
            Home Assistant unavailable. Controls are simulated for demonstration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
