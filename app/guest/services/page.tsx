/**
 * Guest Services Page
 * Allows guests to view and create service requests
 */

'use client';

import { useState, useEffect } from 'react';
import { ServiceRequestForm } from '@/components/guest/ServiceRequestForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ServiceRequest, ServiceRequestType, Priority } from '@/types';

export default function ServicesPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  // Fetch existing service requests
  const fetchRequests = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/guest/service-requests');

      if (!response.ok) {
        throw new Error('Failed to fetch service requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service requests',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle form submission
  const handleSubmit = async (data: {
    type: ServiceRequestType;
    priority: Priority;
    description: string;
  }) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/guest/service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to submit request');
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: 'Request Submitted',
        description: `Your ${formatServiceType(data.type)} request has been submitted successfully.`,
      });

      // Refresh the requests list
      await fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit request',
        variant: 'destructive',
      });
      throw error; // Re-throw to prevent form reset
    } finally {
      setIsLoading(false);
    }
  };

  const formatServiceType = (type: ServiceRequestType): string => {
    const typeMap: Record<ServiceRequestType, string> = {
      housekeeping: 'Housekeeping',
      room_service: 'Room Service',
      maintenance: 'Maintenance',
      concierge: 'Concierge',
    };
    return typeMap[type] || type;
  };

  const formatPriority = (priority: Priority): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: Priority): string => {
    const priorityColors: Record<Priority, string> = {
      low: 'text-gray-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return priorityColors[priority] || 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground">Request hotel services and view your requests</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Request Form */}
        <div>
          <ServiceRequestForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Active Requests */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Your Requests</CardTitle>
              <CardDescription>View the status of your service requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No service requests yet. Submit a request to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {formatServiceType(request.type)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Room {request.roomNumber}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm">{request.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className={getPriorityColor(request.priority)}>
                          Priority: {formatPriority(request.priority)}
                        </span>
                        <span>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {request.salesforceTicketId && (
                        <p className="text-xs text-muted-foreground">
                          Ticket: {request.salesforceTicketId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
