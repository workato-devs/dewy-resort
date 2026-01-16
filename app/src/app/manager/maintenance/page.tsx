'use client';

import { useEffect, useState, useCallback } from 'react';
import { MaintenanceTask, Room } from '@/types';
import { TaskList } from '@/components/manager/TaskList';
import { TaskFilters } from '@/components/manager/TaskFilters';
import { CreateTaskDialog } from '@/components/manager/CreateTaskDialog';
import { TaskDetailView } from '@/components/manager/TaskDetailView';
import { MaintenanceSkeleton } from '@/components/manager/MaintenanceSkeleton';
import { useToast } from '@/hooks/use-toast';

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<MaintenanceTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const { toast } = useToast();

  // Fetch maintenance tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/manager/maintenance');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }
      
      const data = await response.json();
      console.log('[Maintenance Page] Fetched tasks:', data.tasks?.length || 0);
      
      setTasks(data.tasks || []);
      setFilteredTasks(data.tasks || []);
      
      // Show info if no tasks found
      if (!data.tasks || data.tasks.length === 0) {
        toast({
          title: 'No Tasks Found',
          description: 'No maintenance tasks found. Create a new task to get started.',
        });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load maintenance tasks',
        variant: 'destructive',
      });
      // Set empty arrays so UI doesn't break
      setTasks([]);
      setFilteredTasks([]);
    }
  }, [toast]);

  // Fetch rooms for task creation
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/manager/dashboard');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchRooms()]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchTasks]);

  // Apply filters
  useEffect(() => {
    let filtered = [...tasks];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  }, [tasks, statusFilter, priorityFilter]);

  // Create new task
  const handleCreateTask = async (taskData: {
    roomId: string;
    title: string;
    description: string;
    priority: string;
    assignedTo?: string;
  }) => {
    try {
      // Get user ID from session (for demo, we'll use a mock manager ID)
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      const createdBy = sessionData.user?.id || 'manager_1';

      const response = await fetch('/api/manager/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          createdBy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const data = await response.json();
      
      toast({
        title: 'Success',
        description: taskData.assignedTo 
          ? 'Task created and notification sent'
          : 'Task created successfully',
      });

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update task status
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/manager/maintenance/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      toast({
        title: 'Success',
        description: 'Task status updated',
      });

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  // Update task details
  const handleTaskUpdate = async (
    taskId: string,
    updates: {
      status?: string;
      priority?: string;
      assignedTo?: string;
    }
  ) => {
    try {
      const response = await fetch(`/api/manager/maintenance/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      const data = await response.json();
      
      toast({
        title: 'Success',
        description: updates.assignedTo 
          ? 'Task updated and notification sent'
          : 'Task updated successfully',
      });

      // Update selected task
      setSelectedTask(data.task);

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Handle task click
  const handleTaskClick = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setDetailViewOpen(true);
  };

  if (loading) {
    return <MaintenanceSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-gray-100">Maintenance Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track maintenance tasks across all rooms
          </p>
        </div>
        <CreateTaskDialog
          onCreateTask={handleCreateTask}
          rooms={rooms.map(room => ({ id: room.id, roomNumber: room.roomNumber }))}
        />
      </div>

      <TaskFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
      />

      <div>
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
        <TaskList
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      </div>

      <TaskDetailView
        task={selectedTask}
        open={detailViewOpen}
        onClose={() => {
          setDetailViewOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}
