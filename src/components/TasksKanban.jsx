import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, Phone, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const TASK_COLUMNS = [
  { id: 'Pending', name: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700', icon: Clock },
  { id: 'Overdue', name: 'Overdue', color: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700', icon: AlertCircle },
  { id: 'Completed', name: 'Completed', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700', icon: CheckCircle }
];

export default function TasksKanban({ tasks, onDragEnd, onTaskClick }) {
  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      const taskStatus = task.completedDate ? 'Completed' :
        new Date(task.scheduledDate) < new Date() ? 'Overdue' : 'Pending';
      return taskStatus === status;
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500';
      case 'medium':
        return 'border-l-4 border-l-yellow-500';
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          const Icon = column.icon;
          
          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-lg border-2 ${column.color} dark:shadow-md ${
                    snapshot.isDraggingOver ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                  }`}
                >
                  {/* Column header */}
                  <div className="p-4 border-b bg-white/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 dark:text-white" />
                      <h3 className="font-semibold text-lg dark:text-white">{column.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-gray-300">{columnTasks.length} tasks</p>
                  </div>

                  {/* Task list */}
                  <div className="p-2 space-y-2 min-h-[500px] max-h-[600px] overflow-y-auto">
                    {columnTasks.map((task, index) => {
                      const status = task.completedDate ? 'Completed' :
                        new Date(task.scheduledDate) < new Date() ? 'Overdue' : 'Pending';

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onTaskClick(task)}
                              className={`p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                                getPriorityColor(task.priority)} 
                                bg-white dark:bg-gray-800 
                                border-gray-200 dark:border-gray-700
                                ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                              `}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-semibold text-sm dark:text-white">{task.title}</h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                    }`}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground dark:text-gray-300 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                {task.leadName && (
                                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {task.leadName}
                                  </div>
                                )}
                                {task.leadContact && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                                    <Phone className="h-3 w-3" />
                                    <span>{task.leadContact}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(task.scheduledDate).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs mt-1">
                                  {status === 'Completed' && <CheckCircle className="h-3 w-3 text-green-600" />}
                                  {status === 'Overdue' && <AlertCircle className="h-3 w-3 text-red-600" />}
                                  {status === 'Pending' && <Clock className="h-3 w-3 text-blue-600" />}
                                  <span className="dark:text-white">{status}</span>
                                </div>
                                {task.completedDate && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    ✓ Completed: {new Date(task.completedDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}