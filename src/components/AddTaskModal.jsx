import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import User from '@/entities/User';

const PRIORITIES = ['low', 'medium', 'high'];
const TASK_TYPES = ['call', 'email', 'meeting', 'follow-up', 'demo', 'other'];

export default function AddTaskModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    leadId: '',
    leadName: '',
    leadContact: '',
    type: 'call',
    priority: 'medium',
    status: 'pending',
    scheduledDate: '',
    assignedTo: ''
  });

  useEffect(() => {
    if (open) {
      loadLeads();
      loadCurrentUser();
    }
  }, [open]);

  const loadLeads = async () => {
    try {
      const allLeads = await Lead.list('-createdAt', 500);
      setLeads(allLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      setFormData(prev => ({ ...prev, assignedTo: user.email }));
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLeadSelect = (leadId) => {
    const selectedLead = leads.find(l => l.id === leadId);
    if (selectedLead) {
      setFormData({
        ...formData,
        leadId: selectedLead.id,
        leadName: selectedLead.name || '',
        leadContact: selectedLead.contact || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Task.create(formData);
      alert('Task created successfully!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      leadId: '',
      leadName: '',
      leadContact: '',
      type: 'call',
      priority: 'medium',
      status: 'pending',
      scheduledDate: '',
      assignedTo: currentUser?.email || ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Follow up call with client"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task details..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="lead">Related Lead</Label>
            <Select value={formData.leadId} onValueChange={handleLeadSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead (optional)" />
              </SelectTrigger>
              <SelectContent>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name || 'Unknown'} - {lead.companyName || lead.contact}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Task Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="scheduledDate">Scheduled Date & Time *</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder="Email address"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}