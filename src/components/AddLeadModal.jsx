import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/utils/Api';
import useUser from "@/hooks/useUser";

export default function AddLeadModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [salesAgents, setSalesAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [stages, setStages] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [objections, setObjections] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    companyName: '',
    website: '',
    industry: '',
    stage: '',
    funnel: '',
    objections: '',
    followUpBy: '',
    query: '',
    comments: '',
    date: new Date().toLocaleDateString('en-GB'),
  });
  const { user } = useUser();
  const isPartner = user?.role?.isPartner;

  useEffect(() => {
    const fetchLeadMeta = async () => {
      try {
        const [funnelsRes, stagesRes, objectionsRes] = await Promise.all([
          api.get("/api/leads/funnels"),
          api.get("/api/leads/stages"),
          api.get("/api/leads/objections"),
        ]);

        // Extract `data` from API response
        setFunnels(funnelsRes.data?.data || []);
        setStages(stagesRes.data?.data || []);
        setObjections(objectionsRes.data?.data || []);
      } catch (error) {
        console.error("Error fetching lead metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadMeta();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      let payload = {
        Name: formData.name,
        Phone: formData.contact,
        Email: formData.email,
        CompanyName: formData.companyName,
        Website: formData.website,
        Industry: formData.industry,
        Date: formData.date
      };

      if (isPartner) {
        payload.Partner = user?.email;
      } else {
        payload = {
          ...payload,
          Stage: formData.stage,
          Funnel: formData.funnel,
          Objections: formData.objections,
          "Followup By": formData.followUpBy,
          Query: formData.query,
          Comments: formData.comments
        };
      }

      const res = await api.post('/api/leads', payload);

      if (!res?.data?.ok) {
        throw new Error(res?.data?.message || 'Failed to create lead');
      }

      onSuccess?.();
      handleClose();

    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      contact: '',
      email: '',
      companyName: '',
      website: '',
      industry: '',
      stage: '',
      funnel: '',
      followUpBy: '',
      objections: '',
      query: '',
      comments: '',
      date: new Date().toLocaleDateString('en-GB')
    });
    onClose();
  };

  useEffect(() => {

    if (!open) {
      return;
    }

    const fetchSalesAgents = async () => {
      try {
        setAgentsLoading(true);

        const res = await api.get('/api/users/user');

        const users = res?.data || [];

        // Filter SALES + ADMIN
        const salesAndAdmins = users.filter((user) => {

          return (
            user.role?.isSales === true ||
            user.role?.isAdmin === true
          );
        });

        setSalesAgents(salesAndAdmins);
      } catch (err) {
        setSalesAgents([]);
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchSalesAgents();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact">Contact *</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>
          </div>

          {!isPartner && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stage" className="block mb-2">Stage *</Label>
                <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="funnel" className="block mb-2">Funnel *</Label>
                <Select value={formData.funnel} onValueChange={(value) => setFormData({ ...formData, funnel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {funnels.map(funnel => (
                      <SelectItem key={funnel} value={funnel}>{funnel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="objections" className="block mb-2">Objections *</Label>
                <Select value={formData.objections} onValueChange={(value) => setFormData({ ...formData, objections: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {objections.map(objection => (
                      <SelectItem key={objection} value={objection}>{objection}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="followUpBy" className="block mb-2">Sales Agent</Label>
                <Select value={formData.followUpBy} onValueChange={(value) => setFormData({ ...formData, followUpBy: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentsLoading && (
                      <SelectItem value="loading" disabled>
                        Loading agents...
                      </SelectItem>
                    )}

                    {!agentsLoading && salesAgents.length === 0 && (
                      <SelectItem value="none" disabled>
                        No sales agents found
                      </SelectItem>
                    )}

                    {salesAgents.map((agent) => (
                      <SelectItem
                        key={agent._id}          // ✅ string key
                        value={agent.name}       // ✅ store name (or agent._id if you prefer)
                      >
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!isPartner && (
            <>
              <div>
                <Label htmlFor="query">Query</Label>
                <Textarea
                  id="query"
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}