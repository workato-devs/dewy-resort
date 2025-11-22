'use client';

import { MaintenanceTask } from '@/types';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface TaskDetailViewProps {
  task: MaintenanceTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: {
    status?: string;
    priority?: string;
    assignedTo?: string;
  }) => Promise<void>;
}

export function TaskDetailView({ task, open, onClose, onUpdate }: TaskDetailViewProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: task?.status || '',
    priority: task?.priority || '',
    assignedTo: task?.assignedTo || '',
  });

  // Update form data when task changes
  if (task && formData.status !== task.status && !editing) {
    setFormData({
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo || '',
    });
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 hover:bg-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleSave = async () => {
    if (!task) return;

    setLoading(true);
    try {
      const updates: any = {};
      
      if (formData.status !== task.status) {
        updates.status = formData.status;
      }
      if (formData.priority !== task.priority) {
        updates.priority = formData.priority;
      }
      if (formData.assignedTo !== (task.assignedTo || '')) {
        updates.assignedTo = formData.assignedTo || null;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdate(task.id, updates);
      }
      
      setEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Room {task.roomId} • Created {new Date(task.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="mt-1 text-sm text-gray-700">{task.description}</p>
          </div>

          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-assignedTo">Assigned To</Label>
                <Input
                  id="edit-assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Staff member name or ID"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {formatStatus(task.status)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Assigned To</Label>
                <p className="mt-1 text-sm text-gray-700">
                  {task.assignedTo || 'Not assigned'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Created By</Label>
                <p className="mt-1 text-sm text-gray-700">{task.createdBy}</p>
              </div>

              {task.completedAt && (
                <div>
                  <Label className="text-sm font-medium">Completed At</Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {new Date(task.completedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    status: task.status,
                    priority: task.priority,
                    assignedTo: task.assignedTo || '',
                  });
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              Edit Task
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
