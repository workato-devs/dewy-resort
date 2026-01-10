/**
 * ActiveRequestsCard Component
 * Displays pending and in-progress service requests
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceRequest } from '@/types';

interface ActiveRequestsCardProps {
  requests: ServiceRequest[];
}

export function ActiveRequestsCard({ requests }: ActiveRequestsCardProps) {
  const serviceTypeLabels = {
    housekeeping: 'Housekeeping',
    room_service: 'Room Service',
    maintenance: 'Maintenance',
    concierge: 'Concierge',
  };

  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const priorityColors = {
    low: 'text-gray-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(dateObj);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active service requests
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {serviceTypeLabels[request.type]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${statusColors[request.status]}`}
                      >
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.description}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${priorityColors[request.priority]}`}>
                    {request.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(request.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
