import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Edit, Save, X, Plus, Calendar, CheckCircle, Clock,
  AlertCircle, Trash2, Phone, Mail, Building, Globe, User,
  MessageSquare, FileText, History
} from 'lucide-react';
import { api } from '@/utils/Api';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetail() {
  const navigate = useNavigate();
  const { id: leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [editedLead, setEditedLead] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [salesAgents, setSalesAgents] = useState([]);
  const [stages, setStages] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    priority: 'medium',
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      alert('No lead ID provided');
      navigate(-1);
      return;
    }
    loadLeadData(leadId);
    fetchMetaData();
  }, [leadId]);

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

  // Load lead by ID
  const loadLeadData = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/leads/${id}`);

      if (!res.data.ok) {
        throw new Error("Failed to fetch lead");
      }

      const data = res.data.data;

      const mappedLead = {
        // ✅ REQUIRED — coming from sheet "Id" column
        id: data.Id,
        _rowNumber: data._rowNumber, // 🔥 Required for backend updates
        name: data.Name || "",
        contact: data.Phone || "",
        email: data.Email || "",
        companyName: data["Company Name"] || "",
        industry: data.Industry || "",
        website: data.Website || "",
        query: data.Query || "",
        comments: data.Comments || "",
        stage: data.Stage || "",
        funnel: data.Funnel || "",
        followUpBy: data["Followup By"] || "",
        followUpOn: data["Follow up on"] || "",
        rebuttal: data.Rebuttal || "",

        date: data.Date || "",
        updatedAt: data["Last updated on"] || "",
      };

      setLead(mappedLead);
      setEditedLead(mappedLead);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch lead !!!");
      navigate(-1);
    } finally {
      setLoading(false);
    }
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

  // Update lead by ID
  const handleSaveLead = async () => {
    if (!editedLead?.id || !editedLead?._rowNumber) {
      console.error("Missing id or _rowNumber");
      return;
    }

    setLoading(true);
    try {
      // Build payload with only changed fields
      const updatePayload = buildUpdatePayload(lead, editedLead);

      if (Object.keys(updatePayload).length === 0) {
        // No changes, just exit edit mode
        setIsEditing(false);
        return;
      }

      // Call backend API with _rowNumber and changed fields only
      const res = await api.put(`/api/leads/${editedLead.id}`, {
        _rowNumber: editedLead._rowNumber, // 🔥 Required for backend
        updates: updatePayload,
      });

      if (!res.data.success) {
        throw new Error(res.data.error || "Failed to update lead");
      }

      // Update local state with edited lead
      setLead({ ...editedLead });
      setIsEditing(false);
      toast.success("Lead updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update lead !!!");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedLead({ ...lead });
    setIsEditing(false);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.scheduledDate) {
      alert('Please fill in task title and scheduled date');
      return;
    }

    setLoading(true);
    try {
      await Task.create({
        leadId: lead.id,
        leadName: lead.name || 'Unknown',
        leadContact: lead.contact,
        title: newTask.title,
        description: newTask.description,
        scheduledDate: new Date(newTask.scheduledDate).toISOString(),
        priority: newTask.priority,
        status: newTask.status
      });

      setNewTask({
        title: '',
        description: '',
        scheduledDate: '',
        priority: 'medium',
        status: 'pending'
      });
      setShowAddTask(false);

      // Reload tasks
      const leadTasks = await Task.filter({ leadId: lead.id }, '-scheduledDate', 50);
      setTasks(leadTasks);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setLoading(true);
    try {
      await Task.update(taskId, {
        status: 'completed',
        completedDate: new Date().toISOString()
      });

      const leadTasks = await Task.filter({ leadId: lead.id }, '-scheduledDate', 50);
      setTasks(leadTasks);
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
      await Task.delete(taskId);

      const leadTasks = await Task.filter({ leadId: lead.id }, '-scheduledDate', 50);
      setTasks(leadTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'MQL': 'bg-blue-100 text-blue-800',
      'MQL No Response': 'bg-blue-50 text-blue-600',
      'SQL': 'bg-yellow-100 text-yellow-800',
      'SQL No Response': 'bg-yellow-50 text-yellow-600',
      'SQL Not Interested': 'bg-gray-100 text-gray-600',
      'Advanced SQL': 'bg-orange-100 text-orange-800',
      'Qualified': 'bg-purple-100 text-purple-800',
      'Converted': 'bg-green-100 text-green-800',
      'Won': 'bg-green-100 text-green-800',
      'Lost': 'bg-red-100 text-red-800',
      'Not ICP': 'bg-gray-100 text-gray-600',
      'Careers': 'bg-indigo-100 text-indigo-800',
      'Consultant/Partner': 'bg-teal-100 text-teal-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

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
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (!lead || !editedLead) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-40 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-8 w-20 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-3 w-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <Skeleton className="h-6 w-40 mb-4 bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4 items-center"
              >
                <Skeleton className="h-4 col-span-2 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 col-span-1 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 col-span-1 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 col-span-1 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 col-span-1 bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{lead.name || 'Unknown Lead'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStageColor(lead.stage)}>
                    {lead.stage || 'No Stage'}
                  </Badge>
                  {lead.funnel && (
                    <Badge variant="outline">{lead.funnel}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Lead
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveLead} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Lead Details */}
          <div className="col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <User className="h-3 w-3" />
                      Full Name
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedLead.name || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                      />
                    ) : (
                      <p className="text-base font-medium">{lead.name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedLead.contact || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, contact: e.target.value })}
                      />
                    ) : (
                      <p className="text-base font-medium">{lead.contact || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Mail className="h-3 w-3" />
                      Email Address
                    </label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editedLead.email || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                      />
                    ) : (
                      <p className="text-base">{lead.email || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Building className="h-3 w-3" />
                      Company Name
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedLead.companyName || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, companyName: e.target.value })}
                      />
                    ) : (
                      <p className="text-base">{lead.companyName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Building className="h-3 w-3" />
                      Industry
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedLead.industry || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, industry: e.target.value })}
                      />
                    ) : (
                      <p className="text-base">{lead.industry || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <Globe className="h-3 w-3" />
                      Website
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedLead.website || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, website: e.target.value })}
                      />
                    ) : (
                      <p className="text-base">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {lead.website}
                          </a>
                        ) : '-'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lead Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Date</label>
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
                      <p className="text-base">{lead.date || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Lead Age
                    </label>
                    <p className="text-base">{getLeadAge(lead.date)} days</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Funnel</label>
                    {isEditing ? (
                      <Input
                        value={editedLead.funnel || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, funnel: e.target.value })}
                      />
                    ) : (
                      <Badge variant="outline">{lead.funnel || '-'}</Badge>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Stage</label>
                    {isEditing ? (
                      <Select
                        value={editedLead.stage || ''}
                        onValueChange={(value) => setEditedLead({ ...editedLead, stage: value })}
                      >
                        <SelectTrigger>
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
                      <Badge className={getStageColor(lead.stage)}>{lead.stage || '-'}</Badge>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Follow Up By</label>
                    {isEditing ? (
                      <Select
                        value={editedLead.followUpBy || ''}
                        onValueChange={(value) => setEditedLead({ ...editedLead, followUpBy: value })}
                      >
                        <SelectTrigger>
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
                      <p className="text-base">{lead.followUpBy || '-'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <MessageSquare className="h-3 w-3" />
                      Query / Requirements
                    </label>
                    {isEditing ? (
                      <Textarea
                        value={editedLead.query || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, query: e.target.value })}
                        rows={3}
                      />
                    ) : (
                      <p className="text-base">{lead.query || '-'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <MessageSquare className="h-3 w-3" />
                      Comments / Notes
                    </label>
                    {isEditing ? (
                      <Textarea
                        value={editedLead.comments || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, comments: e.target.value })}
                        rows={3}
                      />
                    ) : (
                      <p className="text-base">{lead.comments || '-'}</p>
                    )}
                  </div>
                  {lead.rebuttal && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Rebuttal</label>
                      {isEditing ? (
                        <Textarea
                          value={editedLead.rebuttal || ''}
                          onChange={(e) => setEditedLead({ ...editedLead, rebuttal: e.target.value })}
                          rows={2}
                        />
                      ) : (
                        <p className="text-base">{lead.rebuttal}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tasks & Activities */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Tasks & Reminders ({tasks.length})
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAddTask(!showAddTask)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
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
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No tasks yet. Add a task to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
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

          {/* Right Column - Timeline & Quick Info */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{new Date(lead.updatedAt).toLocaleDateString()}</p>
                </div>
                {lead.createdBy && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground">Created By</p>
                      <p className="font-medium">{lead.createdBy}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <p className="text-muted-foreground">Lead ID</p>
                  <p className="font-mono text-xs">{lead.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="w-0.5 h-full bg-slate-200"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Lead Updated</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-0.5 h-full bg-slate-200"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Lead Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {tasks.filter(t => t.status === 'completed').slice(0, 3).map((task) => (
                    <div key={task.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <div className="w-0.5 h-full bg-slate-200"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">Task Completed</p>
                        <p className="text-xs text-muted-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.completedDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}