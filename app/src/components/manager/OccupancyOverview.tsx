/**
 * OccupancyOverview Component
 * Displays room occupancy statistics for the manager dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, DoorOpen, DoorClosed, Sparkles, Wrench } from 'lucide-react';

interface OccupancyData {
  totalRooms: number;
  occupied: number;
  vacant: number;
  cleaning: number;
  maintenance: number;
  occupancyRate: number;
}

interface OccupancyOverviewProps {
  data: OccupancyData;
}

export function OccupancyOverview({ data }: OccupancyOverviewProps) {
  const stats = [
    {
      label: 'Occupied',
      value: data.occupied,
      icon: DoorClosed,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Vacant',
      value: data.vacant,
      icon: DoorOpen,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Cleaning',
      value: data.cleaning,
      icon: Sparkles,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Maintenance',
      value: data.maintenance,
      icon: Wrench,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Occupancy Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Occupancy Rate */}
          <div className="text-center pb-4 border-b">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {data.occupancyRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Occupancy Rate
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.occupied} of {data.totalRooms} rooms occupied
            </div>
          </div>

          {/* Room Status Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
