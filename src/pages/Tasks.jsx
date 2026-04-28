import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckSquare,
  Calendar,
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Phone,
  Building,
  LayoutGrid,
  List,
  Trash2,
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/CreatePage";
import TasksKanban from "@/components/TasksKanban";
import StickySearchHeader from "@/components/StickySearchHeader";
import { api } from "@/utils/Api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ============================
// ✅ BACKEND ROUTES (EDIT ONLY HERE)
// ============================
const ROUTES = {
  tasksList: "/api/sales-tasks", // GET
  taskCreate: "/api/sales-tasks", // POST
  taskUpdate: (id) => `/api/sales-tasks/${id}`, // PUT
  taskDelete: (id) => `/api/sales-tasks/${id}`, // DELETE
};

const toLower = (v) => String(v || "").trim().toLowerCase();

const normalizeStatus = (rawStatus) => {
  const s = toLower(rawStatus);
  if (!s || s === "pending" || s === "in progress" || s === "progress") return "Pending";
  if (s === "completed" || s === "done") return "Completed";
  return s; // keep as-is for any unknown
};

// calculate actual display status including overdue
const displayStatus = (task) => {
  if (isOverdue(task)) return "Overdue";
  return normalizeStatus(task.status);
};


const normalizePriority = (rawPriority) => {
  const p = toLower(rawPriority);
  if (p === "high" || p === "medium" || p === "low") return p;
  return "medium";
};

const normalizeTask = (task) => {
  const id = task?.id || task?._id;
  return {
    ...task,
    id,
    status: normalizeStatus(task?.status),
    priority: normalizePriority(task?.priority),
  };
};

const isOverdue = (task) => {
  if (!task?.scheduledDate) return false;
  if (normalizeStatus(task.status) === "Completed") return false;
  return new Date(task.scheduledDate) < new Date();
};

const extractArray = (res) => {
  const raw = res?.data?.data ?? res?.data?.tasks ?? res?.data ?? [];
  return Array.isArray(raw) ? raw : [];
};

export default function Tasks() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'kanban'
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    status: "all", // all | in_progress | completed | overdue
    priority: "all", // all | low | medium | high
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskNotes, setTaskNotes] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    notes: "",
    scheduledDate: "",
    priority: "medium",
    status: "Pending",
    leadName: "",
    companyName: "",
    stakeholders: "",
  });

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(ROUTES.tasksList, { withCredentials: true });
      const allTasks = extractArray(res).map(normalizeTask);

      const inProgress = allTasks.filter((t) => normalizeStatus(t.status) === "In Progress").length;
      const completed = allTasks.filter((t) => normalizeStatus(t.status) === "Completed").length;
      const overdue = allTasks.filter((t) => isOverdue(t)).length;

      setStats({
        total: allTasks.length,
        inProgress,
        completed,
        overdue,
      });

      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
      setTasks([]);
      setStats({ total: 0, inProgress: 0, completed: 0, overdue: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await api.get("/api/leads");
        setLeads(res.data?.data || res.data || []);
      } catch (error) {
        console.error("Failed to fetch leads", error);
      }
    };

    fetchLeads();
  }, []);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskNotes(task?.notes || "");
    setShowTaskModal(true);
  };

  const handleUpdateTaskStatus = async (status) => {
    if (!selectedTask?.id) return;
    const normalized = normalizeStatus(status);
    const updates = {
      status: normalized === "Pending" ? "Pending" : "Completed",
      notes: taskNotes,
      completedDate: normalized === "Completed" ? new Date().toISOString() : null,
    };
    const toastId = toast.loading("Updating task...");
    try {
      await api.put(ROUTES.taskUpdate(selectedTask.id), updates, { withCredentials: true });
      toast.success("Task updated", { id: toastId });
      setShowTaskModal(false);
      setSelectedTask(null);
      await loadTasks();
    } catch (e) { toast.error("Failed to update task", { id: toastId }); }
  };

  const handleUpdatePriority = async (taskId, priority) => {
    const toastId = toast.loading("Updating priority...");
    try {
      await api.put(
        ROUTES.taskUpdate(taskId),
        { priority: normalizePriority(priority) },
        { withCredentials: true }
      );
      toast.success("Priority updated", { id: toastId });
      await loadTasks();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Failed to update priority";
      toast.error(msg, { id: toastId });
    }
  };

  // If your TasksKanban uses react-beautiful-dnd, this works same as your old code :contentReference[oaicite:2]{index=2}
  const handleDragEnd = async (result) => {
    if (!result?.destination) return;

    const { source, destination, draggableId } = result;
    if (source?.droppableId === destination?.droppableId) return;

    const task = tasks.find((t) => String(t.id) === String(draggableId));
    if (!task) return;

    let newStatus = destination.droppableId;

    // overdue is calculated only
    if (newStatus === "overdue") newStatus = "in_progress";

    const normalized = normalizeStatus(newStatus);
    const updates = {
      status: normalized === "in_progress" ? "Pending" : "Completed",
    };

    if (normalized === "completed") updates.completedDate = new Date().toISOString();

    try {
      await api.put(ROUTES.taskUpdate(task.id), updates, { withCredentials: true });
      await loadTasks();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to move task";
      toast.error(msg);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.scheduledDate || !newTask.leadName || !newTask.companyName) {
      toast.error("Please fill in title, scheduled date, lead name, and company");
      return;
    }
    const toastId = toast.loading("Adding task...");
    try {
      await api.post(ROUTES.taskCreate, {
        ...newTask,
        scheduledDate: new Date(newTask.scheduledDate).toISOString(),
        stakeholders: newTask.stakeholders.split(",").map(s => s.trim()),
      }, { withCredentials: true });
      toast.success("Task added", { id: toastId });
      setNewTask({ title: "", description: "", notes: "", scheduledDate: "", priority: "medium", status: "Pending", leadName: "", companyName: "", stakeholders: "" });
      setShowAddTask(false);
      await loadTasks();
    } catch (e) { toast.error("Failed to add task", { id: toastId }); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const toastId = toast.loading("Deleting task...");
    try {
      await api.delete(ROUTES.taskDelete(taskId), { withCredentials: true });
      toast.success("Task deleted", { id: toastId });
      await loadTasks();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Failed to delete task";
      toast.error(msg, { id: toastId });
    }
  };
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const s = displayStatus(task); // overdue calculated

      if (filters.status !== "all" && s !== filters.status) return false;
      if (filters.priority !== "all" && normalizePriority(task.priority) !== filters.priority) return false;

      if (filters.dateFrom || filters.dateTo) {
        const taskDate = new Date(task.scheduledDate);
        if (filters.dateFrom && taskDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && taskDate > new Date(filters.dateTo)) return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          String(task.title || "").toLowerCase().includes(q) ||
          String(task.leadName || "").toLowerCase().includes(q) ||
          String(task.leadContact || "").toLowerCase().includes(q) ||
          String(task.description || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tasks, filters]);

  const getStatusBadge = (status) => {
    const styles = {
      Pending: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Overdue: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />; // Pending
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return styles[priority] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
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
    <div className="min-h-screen bg-background">
      <StickySearchHeader />

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CheckSquare className="h-6 w-6" />
                My Tasks
              </h1>
              <p className="text-muted-foreground">Manage and track tasks</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button onClick={() => setShowAddTask((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button variant="outline" onClick={loadTasks}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.inProgress}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.completed}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{stats.overdue}</CardContent>
          </Card>
        </div>

        {/* Add task */}
        {showAddTask && (
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Task Title */}
                <Input
                  placeholder="Task Title"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                />

                {/* Lead Name */}
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                    >
                      {newTask.leadName
                        ? leads.find((lead) => {
                          const displayName = lead["Name"]?.trim() || lead["Company Name"]?.trim() || "Unnamed Lead";
                          return displayName === newTask.leadName;
                        })?.name ||
                        leads.find((lead) => {
                          const displayName = lead["Name"]?.trim() || lead["Company Name"]?.trim() || "Unnamed Lead";
                          return displayName === newTask.leadName;
                        })?.companyName
                        : "Select Lead"}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search lead..." />
                      <CommandEmpty>No lead found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {leads.map((lead) => {
                          const displayName = lead["Name"]?.trim() || lead["Company Name"]?.trim() || "Unnamed Lead";

                          return (
                            <CommandItem
                              key={lead._id}
                              value={displayName}
                              onSelect={(currentValue) => {
                                setNewTask({ ...newTask, leadName: currentValue });
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newTask.leadName === displayName
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {displayName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

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

                {/* Scheduled Date */}
                <Input
                  type="datetime-local"
                  value={newTask.scheduledDate}
                  onChange={e => setNewTask({ ...newTask, scheduledDate: e.target.value })}
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
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddTask}>Add</Button>
                <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search title, lead name, contact..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((f) => ({ ...f, status: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters((f) => ({ ...f, priority: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date From</label>
              <Input
                className="mt-2"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Date To</label>
              <Input
                className="mt-2"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Main View */}
        {viewMode === "kanban" ? (
          <TasksKanban tasks={filteredTasks} onDragEnd={handleDragEnd} onTaskClick={handleTaskClick} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Stakeholders</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredTasks.map((task) => {
                        const status = displayStatus(task);

                        return (
                          <TableRow key={task.id} className="cursor-pointer hover:bg-muted/30">
                            {/* Title */}
                            <TableCell onClick={() => handleTaskClick(task)} className="font-medium">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status)}
                                <span className={status === "Completed" ? "line-through text-muted-foreground" : ""}>
                                  {task.title}
                                </span>
                              </div>
                              {task.description && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell onClick={() => handleTaskClick(task)}>
                              <Badge className={getStatusBadge(status)}>{status}</Badge>
                            </TableCell>

                            {/* Priority */}
                            <TableCell>
                              <Select
                                value={normalizePriority(task.priority)}
                                onValueChange={(v) => handleUpdatePriority(task.id, v)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Scheduled Date */}
                            <TableCell onClick={() => handleTaskClick(task)} className="text-muted-foreground">
                              {task.scheduledDate ? new Date(task.scheduledDate).toLocaleString() : "-"}
                            </TableCell>

                            {/* Lead */}
                            <TableCell onClick={() => handleTaskClick(task)}>
                              {task.leadName ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <span className="font-medium">{task.leadName}</span>
                                  </div>
                                </div>
                              ) : "-"}
                            </TableCell>

                            {/* Company */}
                            <TableCell onClick={() => handleTaskClick(task)}>
                              {task.companyName || "-"}
                            </TableCell>

                            {/* Stakeholders */}
                            <TableCell onClick={() => handleTaskClick(task)}>
                              {Array.isArray(task.stakeholders) && task.stakeholders.length > 0
                                ? task.stakeholders.join(", ")
                                : task.stakeholders || "-"}
                            </TableCell>

                            {/* Notes */}
                            <TableCell onClick={() => handleTaskClick(task)}>
                              {task.notes ? (
                                <div className="text-sm text-muted-foreground line-clamp-1">{task.notes}</div>
                              ) : "-"}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {status !== "Completed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTaskStatus("Completed")}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task Modal */}
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Task Title</label>
                    <p className="text-lg font-semibold">{selectedTask.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {selectedTask.scheduledDate ? new Date(selectedTask.scheduledDate).toLocaleString() : "-"}
                    </p>
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusBadge(displayStatus(selectedTask))}>
                        {displayStatus(selectedTask)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <div className="mt-1">
                      <Badge className={getPriorityBadge(normalizePriority(selectedTask.priority))}>
                        {normalizePriority(selectedTask.priority)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedTask.leadName && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Lead Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p>{selectedTask.leadName}</p>
                      </div>
                      {selectedTask.leadContact && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Contact</label>
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {selectedTask.leadContact}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <Textarea
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="Add notes about this task..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {selectedTask.completedDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Completed On</label>
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {new Date(selectedTask.completedDate).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                Close
              </Button>

              {selectedTask && displayStatus(selectedTask) !== "Completed" ? (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleUpdateTaskStatus("Completed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Completed
                </Button>
              ) : selectedTask ? (
                <Button variant="outline" onClick={() => handleUpdateTaskStatus("In Progress")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Reopen (In Progress)
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}