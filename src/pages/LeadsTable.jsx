import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Save, Download, Trash2, ArrowUpDown, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/CreatePage';
import StickySearchHeader from '@/components/StickySearchHeader';
import { api } from '@/utils/Api';
import { Skeleton } from "@/components/ui/skeleton";
import AddLeadModal from '@/components/AddLeadModal';

const STAGES = ['MQL', 'SQL', 'Advanced SQL', 'Discovery Stage', 'Quote Stage', 'Won', 'Lost'];
const FUNNELS = ['F1 (C2WA ADs)', 'F2 (Linkedin Lead Form Ads)', 'F3 (Founder refferals)'];
const SALES_AGENTS = ['Sujay Putta', 'Thanuja Dasari'];

export default function LeadsTable() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({ stage: 'all', funnel: 'all', salesAgent: 'all' });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10; // change to 20/25 if needed

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  const normalizeLead = (lead) => ({
    id: lead.Id || lead._rowNumber || '', // REQUIRED for table edits
    date: lead.Date || lead.date || '',
    name: lead.Name || lead.name || '',
    contact: lead['Phone Number'] || lead.Contact || lead.contact || '',
    email: lead.Email || lead.email || '',
    companyName: lead['Company Name'] || lead.companyName || '',
    industry: lead['Specified Industry'] || lead.industry || '',
    stage: lead.Stage || lead.stage || '',
    funnel: lead.Funnel || lead.funnel || '',
    followUpBy: lead['Followup By'] || lead.followUpBy || '',
    query: lead.Query || lead.query || '',
    comments: lead.Comments || lead.comments || '',
    website: lead.Website || lead.website || '',
  });

  // -------------------- API CALLS --------------------
  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get(`api/leads`);
      const leadsArray = Array.isArray(res.data?.data) ? res.data.data : [];
      const normalizedLeads = leadsArray.map(normalizeLead);
      setLeads(normalizedLeads);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData) => {
    return api.post(`api/leads`, leadData);
  };

  const updateLead = async (id, leadData) => {
    return api.put(`/api/leads/${id}`, leadData);
  };

  const deleteLead = async (id) => {
    return api.delete(`/api/leads/${id}`);
  };
  // -------------------- END API CALLS --------------------

  const handleCellEdit = (leadId, field, value) => {
    setLeads(leads.map(lead => lead.id === leadId ? { ...lead, [field]: value } : lead));
    setHasChanges(true);
  };

  const handleAddNewRow = () => setShowAddLeadModal(true);

  const handleAddLeadSuccess = async () => {
    setShowAddLeadModal(false);
    await loadLeads();
  };

  const handleDeleteRow = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(leadId);
      setLeads(leads.filter(lead => lead.id !== leadId));
      setHasChanges(false);
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // New leads (without id)
      const newLeads = leads.filter(l => !l.id);
      for (const lead of newLeads) {
        await createLead(lead);
      }

      // Existing leads
      const existingLeads = leads.filter(l => l.id);
      for (const lead of existingLeads) {
        await updateLead(lead.id, lead);
      }

      await loadLeads();
      alert('All changes saved successfully!');
    } catch (error) {
      console.error('Error saving leads:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const exportData = filteredLeads.map(lead => [
        lead.date || '',
        lead.contact || '',
        lead.funnel || '',
        lead.stage || '',
        lead.name || '',
        lead.companyName || '',
        lead.website || '',
        lead.industry || '',
        lead.query || '',
        lead.email || '',
        lead.comments || '',
        lead.followUpDate || '',
        lead.followUpTask || '',
        lead.followUpBy || ''
      ]);

      const headers = [
        'Date', 'Contact', 'Funnel', 'Stage', 'Name', 'Company Name',
        'Website', 'Industry', 'Query', 'Email', 'Comments',
        'Follow Up Date', 'Follow Up Task', 'Follow Up By'
      ];

      const response = await api.post(`/documents/export-excel`,
        { sheets: [{ name: 'Leads', data: [headers, ...exportData] }] }
      );

      const signedUrlResponse = await api.get(`/files/signed-url`,);

      window.open(signedUrlResponse.data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const parseDate = (d) => {
    if (!d) return 0;
    const [date, time] = d.split(" ");
    const [dd, mm, yyyy] = date.split("/");
    return new Date(`${yyyy}-${mm}-${dd}T${time || "00:00:00"}`).getTime();
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const key = sortConfig.key;

    const aVal = a[key] ?? "";
    const bVal = b[key] ?? "";

    // ✅ DATE SORT (LATEST FIRST)
    if (key === "date") {
      const aTime = parseDate(aVal);
      const bTime = parseDate(bVal);
      return sortConfig.direction === "asc"
        ? aTime - bTime
        : bTime - aTime;
    }

    // Number sort
    if (!isNaN(aVal) && !isNaN(bVal)) {
      return sortConfig.direction === "asc"
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    }

    // String sort
    return sortConfig.direction === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const filteredLeads = sortedLeads.filter(lead => {
    if (filters.stage !== 'all' && lead.stage !== filters.stage) return false;
    if (filters.funnel !== 'all' && lead.funnel !== filters.funnel) return false;
    if (filters.salesAgent !== 'all' && lead.followUpBy !== filters.salesAgent) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);

  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getVisiblePages = (current, total, delta = 2) => {
    const pages = [];

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    pages.push(1);

    if (left > 2) {
      pages.push("ellipsis-left");
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < total - 1) {
      pages.push("ellipsis-right");
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  };

  const EditableCell = ({ lead, field, type = 'text', options = null }) => {
    const isEditing = editingCell === `${lead.id}-${field}`;
    const value = lead[field] || '';

    if (isEditing) {
      if (options) {
        return (
          <Select
            value={value}
            onValueChange={(newValue) => {
              handleCellEdit(lead.id, field, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          type={type}
          value={value}
          onChange={(e) => handleCellEdit(lead.id, field, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (['Enter', 'Escape'].includes(e.key)) setEditingCell(null); }}
          autoFocus
          className="h-8 text-sm"
        />
      );
    }

    return (
      <div
        onClick={() => setEditingCell(`${lead.id}-${field}`)}
        className="cursor-pointer hover:bg-slate-100 p-2 rounded min-h-[32px] transition-colors"
      >
        {value || <span className="text-muted-foreground italic">Click to edit</span>}
      </div>
    );
  };

  const SortableHeader = ({ label, sortKey }) => (
    <TableHead>
      <Button variant="ghost" size="sm" onClick={() => handleSort(sortKey)} className="font-semibold hover:bg-slate-100">
        {label} <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

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
    <div className="min-h-screen">
      <StickySearchHeader />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Leads Table</h1>
              <p className="text-muted-foreground">Excel-like view to manage all leads</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddNewRow} variant="default"><Plus className="mr-2 h-4 w-4" />Add New Lead</Button>
            {/* <Button onClick={handleExportToExcel} variant="outline"><Download className="mr-2 h-4 w-4" />Export to Excel</Button> */}
            {hasChanges && <Button onClick={handleSaveAll} disabled={saving} className="bg-green-600 hover:bg-green-700"><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save All Changes'}</Button>}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center"><Filter className="mr-2 h-5 w-5" />Filters</div>
              {(filters.stage !== 'all' || filters.funnel !== 'all' || filters.salesAgent !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => setFilters({ stage: 'all', funnel: 'all', salesAgent: 'all' })}><X className="mr-1 h-4 w-4" />Clear Filters</Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Stage</label>
                <Select value={filters.stage} onValueChange={v => setFilters({ ...filters, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Funnel</label>
                <Select value={filters.funnel} onValueChange={v => setFilters({ ...filters, funnel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funnels</SelectItem>
                    {FUNNELS.map(funnel => <SelectItem key={funnel} value={funnel}>{funnel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Sales Agent</label>
                <Select value={filters.salesAgent} onValueChange={v => setFilters({ ...filters, salesAgent: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {SALES_AGENTS.map(agent => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Leads ({filteredLeads.length})
              {hasChanges && <Badge className="ml-2 bg-orange-500">Unsaved Changes</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto scrollbar-hide">
              <div className="max-h-[600px] overflow-y-auto border rounded-lg scrollbar-hide">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 dark:bg-muted z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">Actions</TableHead>
                      <SortableHeader label="Date" sortKey="date" />
                      <SortableHeader label="Name" sortKey="name" />
                      <SortableHeader label="Contact" sortKey="contact" />
                      <SortableHeader label="Email" sortKey="email" />
                      <SortableHeader label="Company" sortKey="companyName" />
                      <SortableHeader label="Industry" sortKey="industry" />
                      <SortableHeader label="Stage" sortKey="stage" />
                      <SortableHeader label="Funnel" sortKey="funnel" />
                      <SortableHeader label="Sales Agent" sortKey="followUpBy" />
                      <TableHead>Query</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Website</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map(lead => (
                      <TableRow key={lead.id} className={lead.isNew ? 'bg-green-50' : ''}>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRow(lead.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                        <TableCell className="min-w-[120px]"><EditableCell lead={lead} field="date" type="text" /></TableCell>
                        <TableCell className="min-w-[150px]"><EditableCell lead={lead} field="name" /></TableCell>
                        <TableCell className="min-w-[130px]"><EditableCell lead={lead} field="contact" /></TableCell>
                        <TableCell className="min-w-[180px]"><EditableCell lead={lead} field="email" type="email" /></TableCell>
                        <TableCell className="min-w-[180px]"><EditableCell lead={lead} field="companyName" /></TableCell>
                        <TableCell className="min-w-[150px]"><EditableCell lead={lead} field="industry" /></TableCell>
                        <TableCell className="min-w-[150px]"><EditableCell lead={lead} field="stage" options={STAGES} /></TableCell>
                        <TableCell className="min-w-[200px]"><EditableCell lead={lead} field="funnel" options={FUNNELS} /></TableCell>
                        <TableCell className="min-w-[150px]"><EditableCell lead={lead} field="followUpBy" options={SALES_AGENTS} /></TableCell>
                        <TableCell className="min-w-[250px]"><EditableCell lead={lead} field="query" /></TableCell>
                        <TableCell className="min-w-[250px]"><EditableCell lead={lead} field="comments" /></TableCell>
                        <TableCell className="min-w-[200px]"><EditableCell lead={lead} field="website" type="url" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {/* Previous */}
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>

                    {/* Page numbers */}
                    {getVisiblePages(currentPage, totalPages).map((page, index) => {
                      if (page === "ellipsis-left" || page === "ellipsis-right") {
                        return (
                          <PaginationItem key={index}>
                            <span className="px-3 text-muted-foreground">…</span>
                          </PaginationItem>
                        );
                      }

                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {/* Next */}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">💡 How to use:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Click any cell to edit inline</li>
              <li>• Press Enter or click outside to save cell changes</li>
              <li>• Click "Add New Lead" to create a new row</li>
              <li>• Click column headers to sort</li>
              <li>• Use filters to narrow down results</li>
              <li>• Click "Save All Changes" to persist all edits to database</li>
              <li>• Export to Excel to download current view</li>
            </ul>
          </CardContent>
        </Card>
        {/* Add Lead Modal */}
        <AddLeadModal open={showAddLeadModal} onClose={() => setShowAddLeadModal(false)} onSuccess={handleAddLeadSuccess} />
      </div>
    </div>
  );
}
