'use client';

import { MaintenanceTask } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TaskListProps {
  tasks: MaintenanceTask[];
  onTaskClick: (task: MaintenanceTask) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskList({ tasks, onTaskClick, onStatusChange }: TaskListProps) {
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

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'assigned';
      case 'assigned':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return null;
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No maintenance tasks found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const nextStatus = getNextStatus(task.status);
        
        return (
          <Card 
            key={task.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onTaskClick(task)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Room {task.roomId || (task as any).room_id}
                  </p>
                </div>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">{task.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {formatStatus(task.status)}
                  </Badge>
                  {task.assignedTo && (
                    <span className="text-sm text-gray-600">
                      Assigned to: {task.assignedTo}
                    </span>
                  )}
                </div>
                
                {nextStatus && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(task.id, nextStatus);
                    }}
                  >
                    Mark as {formatStatus(nextStatus)}
                  </Button>
                )}
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Created: {new Date(task.createdAt).toLocaleDateString()}
                {task.completedAt && (
                  <> • Completed: {new Date(task.completedAt).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
