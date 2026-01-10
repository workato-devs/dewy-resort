/**
 * ServiceRequestForm Component
 * Form for creating service requests
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ServiceRequestType, Priority } from '@/types';

interface ServiceRequestFormProps {
  onSubmit: (data: {
    type: ServiceRequestType;
    priority: Priority;
    description: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ServiceRequestForm({ onSubmit, isLoading = false }: ServiceRequestFormProps) {
  const [type, setType] = useState<ServiceRequestType | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!type) {
      newErrors.type = 'Please select a service type';
    }

    if (!priority) {
      newErrors.priority = 'Please select a priority level';
    }

    if (!description.trim()) {
      newErrors.description = 'Please provide a description';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        type: type as ServiceRequestType,
        priority: priority as Priority,
        description: description.trim(),
      });

      // Reset form on success
      setType('');
      setPriority('');
      setDescription('');
      setErrors({});
    } catch (error) {
      // Error handling is done by parent component
      console.error('Form submission error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Service</CardTitle>
        <CardDescription>
          Submit a request for housekeeping, room service, maintenance, or concierge assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="service-type">Service Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as ServiceRequestType);
                setErrors((prev) => ({ ...prev, type: '' }));
              }}
              disabled={isLoading}
            >
              <SelectTrigger 
                id="service-type" 
                className={errors.type ? 'border-red-500' : ''}
                aria-describedby={errors.type ? 'service-type-error' : undefined}
                aria-invalid={!!errors.type}
              >
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="concierge">Concierge</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p id="service-type-error" className="text-sm text-red-500" role="alert">{errors.type}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => {
                setPriority(value as Priority);
                setErrors((prev) => ({ ...prev, priority: '' }));
              }}
              disabled={isLoading}
            >
              <SelectTrigger 
                id="priority" 
                className={errors.priority ? 'border-red-500' : ''}
                aria-describedby={errors.priority ? 'priority-error' : undefined}
                aria-invalid={!!errors.priority}
              >
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && (
              <p id="priority-error" className="text-sm text-red-500" role="alert">{errors.priority}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe your request in detail..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: '' }));
              }}
              disabled={isLoading}
              className={errors.description ? 'border-red-500' : ''}
              rows={4}
              aria-describedby={errors.description ? 'description-error' : undefined}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p id="description-error" className="text-sm text-red-500" role="alert">{errors.description}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
