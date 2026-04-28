import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Mail, Calendar, Loader2, Send, Rocket, User, Search,
  CheckCircle2, MousePointerClick, SendHorizontal, 
  Inbox, Eye, Minus, History
} from 'lucide-react';

const FollowUpTab = ({ 
  data, campaignData, reportType, setReportType, statusFilter, 
  setStatusFilter, onSync, isSyncing, onSelectContact,
  onQuickSend, customDateRange, setCustomDateRange
}) => {
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleQuickSubmit = async () => {
    if (!quickName || !quickEmail) return alert("Please enter both Name and Email");
    // Fires Template 178 specifically
    await onQuickSend(quickName, quickEmail, "178");
    setQuickName(''); 
    setQuickEmail('');
  };

  const toggleFilter = (filterName) => {
    setStatusFilter(prev => prev === filterName ? 'ALL' : filterName);
  };

  // --- HELPER: PARSE STATUS STRING ---
  const parseStatus = (reportStr) => {
    if (!reportStr) return { delivered: false, openCount: 0, clickCount: 0, source: '-', date: '-' };
    const parts = reportStr.split('|').map(p => p.trim());
    const rawStatus = (parts[0] || "SENT").toUpperCase();
    const extractCount = (str) => {
      const match = str.match(/\((\d+)\)/);
      return match ? parseInt(match[1]) : (str.includes('OPEN') || str.includes('CLICK') ? 1 : 0);
    };
    const isClicked = rawStatus.includes('CLICK');
    const isOpened = rawStatus.includes('OPEN') || isClicked;
    return {
      delivered: rawStatus.includes('DELIVERED') || rawStatus.includes('SENT') || isOpened,
      openCount: isOpened ? extractCount(rawStatus) : 0,
      clickCount: isClicked ? extractCount(rawStatus) : 0,
      date: parts[1] || '-',
      source: parts[2] || 'Follow-up'
    };
  };

  // --- LOCAL SEARCH FILTER ---
  const displayedCampaignData = useMemo(() => {
    return campaignData.filter(lead => {
      const search = searchTerm.toLowerCase();
      return (
        lead.companyName?.toLowerCase().includes(search) ||
        lead.contactPerson?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search)
      );
    });
  }, [campaignData, searchTerm]);

  // --- FUNNEL MATH (Specific to Follow-ups) ---
  const funnel = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const baseData = data.filter(lead => {
      if (!lead.campaignReport || !lead.campaignReport.includes('Follow-up 178')) return false;
      const dateStr = lead.campaignReport.split('|').map(p => p.trim())[1];
      if (reportType === 'DAILY' && dateStr !== today) return false;
      if (reportType === 'WEEKLY' && new Date(dateStr) < oneWeekAgo) return false;
      if (reportType === 'CUSTOM' && customDateRange?.start && customDateRange?.end) {
        const start = new Date(customDateRange.start);
        const end = new Date(customDateRange.end);
        const current = new Date(dateStr);
        if (current < start || current > end) return false;
      }
      return true;
    });

    return {
      sent: baseData.length,
      delivered: baseData.filter(l => l.campaignReport.toUpperCase().includes('DELIVERED') || l.campaignReport.toUpperCase().includes('OPEN') || l.campaignReport.toUpperCase().includes('CLICK')).length,
      opened: baseData.filter(l => l.campaignReport.toUpperCase().includes('OPEN') || l.campaignReport.toUpperCase().includes('CLICK')).length,
      clicked: baseData.filter(l => l.campaignReport.toUpperCase().includes('CLICK')).length
    };
  }, [data, reportType, customDateRange]);

  const statConfig = [
    { label: 'F-Up Sent', val: funnel.sent, color: '[#FDD305]', icon: History, key: 'SENT', activeClass: 'ring-[#FDD305] bg-[#FDD305]/10', text: 'text-slate-900' },
    { label: 'Delivered', val: funnel.delivered, color: 'teal', icon: Inbox, key: 'DELIVERED', activeClass: 'ring-teal-500 bg-teal-50/50', text: 'text-teal-600' },
    { label: 'Opened', val: funnel.opened, color: 'green', icon: Eye, key: 'OPENED', activeClass: 'ring-green-500 bg-green-50/50', text: 'text-green-600' },
    { label: 'Clicked', val: funnel.clicked, color: 'purple', icon: MousePointerClick, key: 'CLICKED', activeClass: 'ring-purple-500 bg-purple-50/50', text: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. QUICK FOLLOW-UP LAUNCHPAD */}
      <Card className="border-[#FDD305]/30 bg-[#FDD305]/5 shadow-sm overflow-hidden">
        <div className="bg-[#FDD305] px-4 py-1.5 text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2">
          <History className="h-3 w-3" /> Quick Follow-up Launch
        </div>
        <CardContent className="p-4 flex flex-col lg:flex-row items-end justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 w-full">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contact Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Enter contact name..." 
                  className="pl-9 h-9 bg-white text-xs border-slate-200 focus:ring-[#FDD305]"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Enter email address..." 
                  className="pl-9 h-9 bg-white text-xs border-slate-200 focus:ring-[#FDD305]"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Button 
            onClick={handleQuickSubmit}
            disabled={isSyncing || !quickName || !quickEmail}
            className="bg-[#FDD305] hover:bg-[#FDD305]/90 text-black h-9 px-8 text-xs font-bold gap-2 mb-[1px] whitespace-nowrap"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Fire Template 178
          </Button>
        </CardContent>
      </Card>

      {/* 2. INTERACTIVE STAT BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statConfig.map((item) => (
          <Card 
            key={item.label}
            onClick={() => toggleFilter(item.key)} 
            className={`cursor-pointer transition-all border shadow-sm hover:shadow-md ${statusFilter === item.key ? `ring-2 ${item.activeClass} border-transparent` : 'hover:bg-slate-50 border-slate-200'}`}
          >
            <CardHeader className="py-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-[10px] font-black uppercase ${statusFilter === item.key ? (item.key === 'SENT' ? 'text-slate-900' : item.text) : 'text-slate-500'}`}>{item.label}</CardTitle>
              <item.icon className={`h-4 w-4 ${statusFilter === item.key ? (item.key === 'SENT' ? 'text-[#FDD305]' : item.text) : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent><div className={`text-2xl font-black ${statusFilter === item.key ? 'text-slate-900' : 'text-slate-900'}`}>{item.val}</div></CardContent>
          </Card>
        ))}

        <Button 
          variant="outline" 
          onClick={onSync} 
          disabled={isSyncing} 
          className="h-full border-2 border-dashed border-slate-200 flex flex-col gap-1 items-center justify-center min-h-[90px] bg-white hover:bg-slate-50 hover:border-[#FDD305] transition-colors"
        >
          {isSyncing ? <Loader2 className={`h-5 w-5 animate-spin text-[#FDD305]`} /> : <Calendar className="h-5 w-5 text-slate-400" />}
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Sync Reports</span>
        </Button>
      </div>

      {/* 3. FOLLOW-UP ACTIVITY LOG GRID */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b flex flex-col lg:flex-row justify-between items-center gap-4 px-4 py-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              <Button variant={reportType === 'DAILY' ? 'white' : 'ghost'} size="sm" onClick={() => setReportType('DAILY')} className="text-[10px] font-bold px-4">TODAY</Button>
              <Button variant={reportType === 'WEEKLY' ? 'white' : 'ghost'} size="sm" onClick={() => setReportType('WEEKLY')} className="text-[10px] font-bold px-4">WEEKLY</Button>
              <Button variant={reportType === 'FULL' ? 'white' : 'ghost'} size="sm" onClick={() => setReportType('FULL')} className="text-[10px] font-bold px-4">ALL TIME</Button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-48">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
               <Input 
                 placeholder="Search warm leads..." 
                 className="pl-8 h-8 text-[10px] bg-white border-slate-200" 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
             </div>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-32 h-8 text-[10px] font-bold uppercase border-slate-200 bg-white">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="ALL">All Events</SelectItem>
                 <SelectItem value="OPENED">Opened</SelectItem>
                 <SelectItem value="CLICKED">Clicked</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[10px] font-black pl-6 py-4 uppercase text-slate-500">Warm Lead</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Delivered</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Opens</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Clicks</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Source</TableHead>
                <TableHead className="text-[10px] font-black text-right pr-6 uppercase text-slate-500">Activity Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCampaignData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs italic">
                    No warm lead activity found.
                  </TableCell>
                </TableRow>
              ) : (
                displayedCampaignData.map(lead => {
                  const p = parseStatus(lead.campaignReport);
                  return (
                    <TableRow key={lead.id} className="hover:bg-[#FDD305]/5 cursor-pointer transition-colors group" onClick={() => onSelectContact(lead)}>
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {lead.companyName || lead.contactPerson || lead.email?.split('@')[0] || "Unknown"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{lead.email}</div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        {p.delivered ? (
                          <div className="flex justify-center"><CheckCircle2 className="h-4 w-4 text-teal-500" /></div>
                        ) : (
                          <div className="flex justify-center"><Minus className="h-4 w-4 text-slate-100" /></div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {p.openCount > 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-black text-[10px] px-2 h-5 rounded-md">
                            {p.openCount}
                          </Badge>
                        ) : (
                          <Minus className="h-4 w-4 text-slate-100 mx-auto" />
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {p.clickCount > 0 ? (
                          <Badge className="bg-purple-600 text-white font-black text-[10px] px-2 h-5 border-none rounded-md">
                            {p.clickCount}
                          </Badge>
                        ) : (
                          <Minus className="h-4 w-4 text-slate-100 mx-auto" />
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border text-slate-800 bg-[#FDD305]/20 border-[#FDD305]/30">
                          {p.source}
                        </span>
                      </TableCell>

                      <TableCell className="text-right pr-6 font-mono text-[10px] text-slate-500 font-bold">
                        {p.date}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default FollowUpTab;