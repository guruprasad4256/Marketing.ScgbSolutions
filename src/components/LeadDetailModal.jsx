import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, CheckCircle, Clock, AlertCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { api } from '@/utils/Api';
import { toast } from "sonner";
import { Label } from '@radix-ui/react-label';

export default function LeadDetailModal({ lead, open, onClose, onUpdate }) {
  const [tasks, setTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [salesAgents, setSalesAgents] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    notes: "",
    scheduledDate: "",
    priority: "medium",
    status: "Pending",
    companyName: "",
    stakeholders: "",
  });

  useEffect(() => {
    if (open && lead) {
      loadTasks();
      fetchMetaData();
      setEditedLead({ ...lead });
      setIsEditing(false);
    }
  }, [open, lead]);

  const fetchMetaData = async () => {
    try {
      const [usersRes, stagesRes] = await Promise.all([
        api.get("/api/users/user"),
        api.get("/api/leads/stages"),
      ]);

      // ✅ Filter Sales Agents (isSales OR Admin)
      const users = usersRes.data || [];
      const filteredAgents = users.filter(
        (u) => u.role?.isSales === true || u.role?.isAdmin === true
      );

      setSalesAgents(filteredAgents);

      // ✅ Set stages
      const stagesData = stagesRes.data?.data || stagesRes.data || [];
      setStages(stagesData);

    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  };

  const loadTasks = async () => {
    if (!lead?.id) return;

    const res = await api.get(`/api/sales-tasks`, { params: { leadId: lead.id } });
    const leadTasks = res.data?.data || res.data || [];

    const now = new Date();
    const updatedTasks = leadTasks.map(task => {
      if (task.status === 'Pending' && new Date(task.scheduledDate) < now) {
        return { ...task, status: 'Overdue' };
      }
      return task;
    });

    setTasks(updatedTasks);
  };

  const buildUpdatePayload = (original, edited) => {
    const payload = {};

    Object.keys(edited).forEach((key) => {
      // skip id
      if (key === "id") return;

      // only send changed values
      if (edited[key] !== original[key]) {
        payload[key] = edited[key];
      }
    });

    return payload;
  };

  const handleSaveLead = async () => {
    if (!editedLead?.id || !editedLead?._rowNumber) {
      console.error("Missing id or _rowNumber");
      return;
    }

    const updatePayload = buildUpdatePayload(lead, editedLead);

    if (Object.keys(updatePayload).length === 0) {
      setIsEditing(false);
      return;
    }

    await api.put(`/api/leads/${editedLead.id}`, {
      _rowNumber: editedLead._rowNumber, // 🔥 REQUIRED
      updates: updatePayload,
    });

    setIsEditing(false);
    onUpdate?.();
  };

  const handleCancelEdit = () => {
    setEditedLead({ ...lead });
    setIsEditing(false);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.scheduledDate || !newTask.companyName) {
      toast.error("Please fill in title, scheduled date, lead name, and company");
      return;
    }
    const toastId = toast.loading("Adding task...");
    try {
      await api.post("/api/sales-tasks", {
        ...newTask,
        leadName: editedLead.name || editedLead.contact || editedLead.companyName || editedLead.email || "",
        scheduledDate: new Date(newTask.scheduledDate).toISOString(),
        stakeholders: newTask.stakeholders.split(",").map(s => s.trim()),
      }, { withCredentials: true });
      toast.success("Task added", { id: toastId });
      setNewTask({ title: "", description: "", notes: "", scheduledDate: "", priority: "medium", status: "Pending", leadName: "", companyName: "", stakeholders: "" });
      setShowAddTask(false);
      await loadTasks();
    } catch (e) { toast.error("Failed to add task", { id: toastId }); }
  };

  const handleCompleteTask = async (taskId) => {
    setLoading(true);
    try {
      // backend route example: PUT /tasks-update/:id
      await api.put(`/tasks-update/${taskId}`, {
        status: 'completed',
        completedDate: new Date().toISOString()
      });
      await loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setLoading(true);
    try {
      // backend route example: DELETE /tasks-delete/:id
      await api.delete(`/tasks-delete/${taskId}`);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!editedLead) return false;

    const name = editedLead["Name"]?.trim();
    const company = editedLead["Company Name"]?.trim();
    const phone = String(editedLead.Phone || "").trim();

    return (
      task.leadName?.trim() === name ||
      task.leadName?.trim() === company ||
      task.leadName?.trim() === phone
    );
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'inline-flex bg-green-100 text-green-800';
      case 'overdue':
        return 'inline-flex bg-red-100 text-red-800';
      default:
        return 'inline-flex bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'inline-flex bg-red-100 text-red-800';
      case 'medium':
        return 'inline-flex bg-yellow-100 text-yellow-800';
      default:
        return 'inline-flex bg-gray-100 text-gray-800';
    }
  };

  const getLeadAge = (dateStr) => {
    if (!dateStr) return "-";

    // Check if date is in DD/MM/YYYY format
    const parts = dateStr.split(" ")[0].split("/"); // ignore time if present
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (isNaN(parsedDate.getTime())) return "-";
      const diff = new Date() - parsedDate;
      return diff >= 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : "-";
    }

    // fallback: try regular Date parsing
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return "-";
    const diff = new Date() - parsedDate;
    return diff >= 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : "-";
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    // Extract just the date part
    const [day, month, year] = dateStr.split(" ")[0].split("/");
    if (!day || !month || !year) return "";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  if (!lead || !editedLead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Lead Details</DialogTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSaveLead} disabled={loading}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                {isEditing ? (
                  <Input
                    value={editedLead.name || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base font-medium">{editedLead.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact</label>
                {isEditing ? (
                  <Input
                    value={editedLead.contact || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, contact: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base font-medium">{editedLead.contact || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editedLead.email || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base">{editedLead.email || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                {isEditing ? (
                  <Input
                    value={editedLead.companyName || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, companyName: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base">{editedLead.companyName || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Industry</label>
                {isEditing ? (
                  <Input
                    value={editedLead.industry || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, industry: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base">{editedLead.industry || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Website</label>
                {isEditing ? (
                  <Input
                    value={editedLead.website || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, website: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base">{editedLead.website || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDateForInput(editedLead.date)}
                    onChange={(e) =>
                      setEditedLead({
                        ...editedLead,
                        date: e.target.value
                      })
                    }
                  />
                ) : (
                  <p className="text-base">{editedLead.date || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Lead Age
                </label>
                <p className="text-base">{getLeadAge(editedLead.date)} days</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Funnel</label>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      value={editedLead.funnel || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, funnel: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <Badge className={getStatusColor('pending')}>{editedLead.funnel || '-'}</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stage</label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedLead.stage || ''}
                      onValueChange={(value) => setEditedLead({ ...editedLead, stage: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id || stage} value={stage.name || stage}>
                            {stage.name || stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getStatusColor('pending')}>{editedLead.stage || '-'}</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Follow Up By</label>
                {isEditing ? (
                  <Select
                    value={editedLead.followUpBy || ''}
                    onValueChange={(value) => setEditedLead({ ...editedLead, followUpBy: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesAgents.map((agent) => (
                        <SelectItem
                          key={agent.user_id}
                          value={agent.name}   // or agent.user_id (better)
                        >
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-base">{editedLead.followUpBy || '-'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Query</label>
                {isEditing ? (
                  <Textarea
                    value={editedLead.query || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, query: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                ) : (
                  <p className="text-base">{editedLead.query || '-'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Comments</label>
                {isEditing ? (
                  <Textarea
                    value={editedLead.comments || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, comments: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                ) : (
                  <p className="text-base">{editedLead.comments || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <Calendar className="h-5 w-5" />
                  Tasks & Reminders ({filteredTasks.length})
                </CardTitle>
                <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <CardContent className='p-0 pt-4'>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Task Title */}
                        <Input
                          placeholder="Task Title"
                          value={newTask.title}
                          onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        />

                        {/* Company Name */}
                        <Input
                          placeholder="Company Name"
                          value={newTask.companyName}
                          onChange={e => setNewTask({ ...newTask, companyName: e.target.value })}
                        />

                        {/* Stakeholders */}
                        <Input
                          placeholder="Stakeholders (comma separated)"
                          value={newTask.stakeholders}
                          onChange={e => setNewTask({ ...newTask, stakeholders: e.target.value })}
                        />

                        {/* Priority */}
                        <Select
                          value={newTask.priority}
                          onValueChange={v => setNewTask({ ...newTask, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Scheduled Date */}
                        <div className="md:col-span-2">
                          <Label className='text-sm'>Scheduled Date</Label>
                          <Input
                            type="datetime-local"
                            className="mt-1"
                            placeholder="Scheduled Date"
                            value={newTask.scheduledDate}
                            onChange={e => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                          />
                        </div>

                        {/* Description (full width) */}
                        <Textarea
                          placeholder="Description"
                          value={newTask.description}
                          onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                          rows={2}
                          className="md:col-span-2"
                        />

                        {/* Notes (full width) */}
                        <Textarea
                          placeholder="Notes"
                          value={newTask.notes}
                          onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
                          rows={2}
                          className="md:col-span-2"
                        />

                      </div>
                    </CardContent>

                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleAddTask}>Add</Button>
                      <Button variant="outline" onClick={() => setShowAddTask(false)}>
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Task Form */}
              {showAddTask && (
                <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
                  <Input
                    placeholder="Task title (e.g., Follow up call)"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Task description (optional)"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Scheduled Date</label>
                      <Input
                        type="datetime-local"
                        value={newTask.scheduledDate}
                        onChange={(e) => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Priority</label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTask} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Task'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddTask(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks yet. Add a task to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`border rounded-lg p-4 ${task.status === 'completed' ? 'bg-green-50' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h4>
                            <Badge className={getPriorityColor(task.priority)} variant="outline">
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.scheduledDate).toLocaleString()}
                            </span>
                            {task.completedDate && (
                              <span className="text-green-600">
                                Completed: {new Date(task.completedDate).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={loading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}