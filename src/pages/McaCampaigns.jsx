import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, User, Building2, MapPin, 
  Briefcase, IndianRupee, History, ExternalLink, 
  Map as MapIcon, PhoneForwarded, X
} from "lucide-react";
import StickySearchHeader from "@/components/StickySearchHeader";
import DashboardTab from '@/components/DashboardTab';
import AllLeadsTab from '@/components/AllLeadsTab';
import CampaignsTab from '@/components/CampaignsTab';
import TemplatesTab from '@/components/TemplatesTab';
import { api } from "@/utils/Api";

const McaCampaigns = () => {
  // --- CORE DATA STATE ---
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // --- FILTER & PAGINATION STATE ---
  const [filters, setFilters] = useState({ search: '', city: '', state: '', legalStatus: '', turnover: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [selectedLeads, setSelectedLeads] = useState([]);

  // --- CAMPAIGN & AUTOMATION STATE ---
  const [reportType, setReportType] = useState('FULL'); 
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [templateId, setTemplateId] = useState("177"); 
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // --- FETCH DATA ---
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/mca-leads', { withCredentials: true });
      if (Array.isArray(response.data)) setData(response.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  // --- FILTERING LOGIC ---
  const filtered = useMemo(() => {
    setCurrentPage(1);
    return data.filter(c => {
      const s = filters.search.toLowerCase();
      if (s && !(c.companyName?.toLowerCase().includes(s) || c.contactPerson?.toLowerCase().includes(s) || c.gstNumber?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s))) return false;
      if (filters.city && c.city !== filters.city) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.legalStatus && c.legalStatus !== filters.legalStatus) return false;
      if (filters.turnover && c.turnover !== filters.turnover) return false;
      return true;
    });
  }, [data, filters]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = useMemo(() =>
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filtered, currentPage, itemsPerPage]
  );

  const uniqueValues = useMemo(() => ({
    cities: [...new Set(data.map(c => c.city).filter(Boolean))].sort(),
    states: [...new Set(data.map(c => c.state).filter(Boolean))].sort(),
    legalStatuses: [...new Set(data.map(c => c.legalStatus).filter(Boolean))].sort(),
    turnovers: [...new Set(data.map(c => c.turnover).filter(Boolean))].sort(),
  }), [data]);

  const campaignData = useMemo(() => {
    return data.filter(lead => lead.campaignReport && lead.campaignReport.trim() !== "");
  }, [data]);

  // --- ACTIONS ---
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.get('/api/mca-campaign/sync-stats', { withCredentials: true });
      if (res.data.success) {
        await fetchLeads();
      }
    } catch (e) { console.error("Sync failed"); }
    setIsSyncing(false);
  };

  const handleManualSend = async () => {
    if (selectedLeads.length === 0) return alert("Select leads first.");
    setIsSyncing(true);
    try {
      await api.post('/api/mca-campaign/manual-send', { leadIds: selectedLeads, templateId }, { withCredentials: true });
      setSelectedLeads([]);
      fetchLeads();
    } catch (e) { alert("Manual send failed."); }
    setIsSyncing(false);
  };

  const handleQuickSend = async (name, email, selectedTemplate) => {
    setIsSyncing(true);
    try {
      const response = await api.post('/api/mca-campaign/quick-send', { name, email, templateId: selectedTemplate }, { withCredentials: true });
      if (response.data.success) fetchLeads();
    } catch (e) { alert("Quick Send failed."); }
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <StickySearchHeader />
      <div className="p-6">
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid grid-cols-4 mb-6 bg-slate-200/40 w-fit p-1 rounded-xl border border-slate-200/50">
            <TabsTrigger value="dashboard" className="rounded-lg font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#1A4486] data-[state=active]:shadow-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="all-leads" className="rounded-lg font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#1A4486] data-[state=active]:shadow-sm">All Leads</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-lg font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#1A4486] data-[state=active]:shadow-sm">Campaigns</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#1A4486] data-[state=active]:shadow-sm">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab data={data} filteredCount={filtered.length} selectedCount={selectedLeads.length} />
          </TabsContent>

          <TabsContent value="all-leads">
            <AllLeadsTab
              paginatedData={paginatedData}
              filters={filters} setFilters={setFilters} uniqueValues={uniqueValues}
              isLoading={isLoading} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
              currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages}
              selectedLeads={selectedLeads} setSelectedLeads={setSelectedLeads}
              toggleSelectAllOnPage={() => {
                const pageIds = paginatedData.map(l => l.id);
                if (pageIds.every(id => selectedLeads.includes(id))) setSelectedLeads(prev => prev.filter(id => !pageIds.includes(id)));
                else setSelectedLeads(prev => [...new Set([...prev, ...pageIds])]);
              }}
              filteredLength={filtered.length}
            />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignsTab
              data={data}
              campaignData={campaignData}
              reportType={reportType} setReportType={setReportType}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              onSync={handleSync} isSyncing={isSyncing}
              onSelectContact={setSelectedContact}
              selectedCount={selectedLeads.length}
              onManualSend={handleManualSend}
              templateId={templateId} setTemplateId={setTemplateId}
              onQuickSend={handleQuickSend}
              customDateRange={customDateRange} setCustomDateRange={setCustomDateRange}
            />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        </Tabs>

        {/* --- REFINED LEAD DOSSIER SIDEBAR --- */}
        <Sheet open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <SheetContent className="sm:max-w-xl overflow-y-auto border-l-0 shadow-2xl p-0">
            {selectedContact && (
              <div className="flex flex-col h-full bg-white font-sans">
                {/* 1. Refined Header */}
                <div className="bg-[#1A4486] p-8 text-white relative">
                  <div className="flex justify-between items-start mb-6">
                    <Badge className="bg-[#FBD407] text-[#1A4486] hover:bg-[#FBD407] font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-full border-none">
                      Intelligence Profile
                    </Badge>
                    <button onClick={() => setSelectedContact(null)} className="text-white/50 hover:text-white transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold leading-tight mb-2 tracking-tight">{selectedContact.companyName}</h2>
                  <div className="flex items-center gap-2 text-white/70 text-xs font-medium font-mono">
                    <Building2 className="h-3.5 w-3.5 opacity-70" />
                    GSTIN: {selectedContact.gstNumber}
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  {/* 2. Contact Hub Section */}
                  <section className="space-y-5">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] flex items-center gap-2">
                       <User className="h-3 w-3" /> Contact Details
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {/* Name Card */}
                      <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm"><User className="h-4 w-4 text-[#1A4486]" /></div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Primary Contact</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedContact.contactPerson || "Not Available"}</p>
                        </div>
                      </div>

                      {/* Email Card */}
                      <a 
                        href={`mailto:${selectedContact.email}`}
                        className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-[#1A4486]/30 group transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-100 group-hover:bg-[#1A4486] transition-colors">
                            <Mail className="h-4 w-4 text-[#1A4486] group-hover:text-white transition-colors" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Email Address</p>
                            <p className="text-sm font-semibold text-slate-800 truncate max-w-[220px]">{selectedContact.email}</p>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#1A4486]" />
                      </a>

                      {/* Phone Numbers with Clean Styling */}
                      <div className="pt-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">Call Direct</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[selectedContact.mobile1, selectedContact.mobile2, selectedContact.mobile3].map((num, idx) => {
                            if (!num || num.length < 5) return null;
                            return (
                              <a 
                                key={idx}
                                href={`tel:${num}`}
                                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:bg-[#1A4486] hover:border-[#1A4486] group transition-all shadow-sm"
                              >
                                <PhoneForwarded className="h-3.5 w-3.5 text-[#1A4486] group-hover:text-[#FBD407] transition-colors" />
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-white transition-colors">{num}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. Firmographics Section */}
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] flex items-center gap-2">
                       <Briefcase className="h-3 w-3" /> Firmographics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                          <IndianRupee className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wide">Turnover</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{selectedContact.turnover || "N/A"}</p>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wide">Legal Status</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{selectedContact.legalStatus || "N/A"}</p>
                      </div>
                    </div>
                  </section>

                  {/* 4. Maps Section */}
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] flex items-center gap-2">
                       <MapPin className="h-3 w-3" /> Business Location
                    </h3>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedContact.address} ${selectedContact.city || ''} ${selectedContact.state || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-5 bg-white rounded-2xl border border-slate-100 hover:border-[#1A4486] group transition-all shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed pr-8">
                          {selectedContact.address}
                        </p>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:bg-[#1A4486] transition-colors">
                          <MapIcon className="h-4 w-4 text-[#1A4486] group-hover:text-[#FBD407]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-8 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">City</p>
                          <p className="text-xs font-semibold text-slate-800">{selectedContact.city || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">State</p>
                          <p className="text-xs font-semibold text-slate-800">{selectedContact.state || "—"}</p>
                        </div>
                      </div>
                    </a>
                  </section>

                  {/* 5. Timeline Section */}
                  <section className="space-y-5 pb-12">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] flex items-center gap-2">
                       <History className="h-3 w-3" /> Activity Feed
                    </h3>
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                      <div className="relative">
                        <div className="absolute -left-[20.5px] top-1.5 h-3 w-3 rounded-full bg-[#FBD407] border-2 border-white shadow-sm" />
                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-center mb-3">
                            <Badge className="bg-white text-[#1A4486] font-bold uppercase text-[9px] px-2.5 py-0.5 rounded-md border border-slate-200 shadow-sm">
                              {selectedContact.campaignReport?.split('|')[0]?.trim() || "Standby"}
                            </Badge>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              {selectedContact.campaignReport?.split('|')[1]?.trim() || "Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Channel: <span className="text-slate-800 font-semibold">{selectedContact.campaignReport?.split('|')[2]?.trim() || "Manual Outreach"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default McaCampaigns;