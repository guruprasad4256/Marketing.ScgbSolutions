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
  Inbox, Eye, Minus, X
} from 'lucide-react';

const CampaignsTab = ({ 
  data, campaignData, reportType, setReportType, statusFilter, 
  setStatusFilter, onSync, isSyncing, onSelectContact,
  onQuickSend, customDateRange, setCustomDateRange
}) => {
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stageFilter, setStageFilter] = useState('ALL'); 
  const [openMin, setOpenMin] = useState('ALL'); 
  const [clickMin, setClickMin] = useState('ALL');
  
  const [quickTemplate, setQuickTemplate] = useState('177');
  const [isQuickLaunchOpen, setIsQuickLaunchOpen] = useState(false);

  const handleStageChange = (value) => {
    setStageFilter(value);
    if (value !== 'ALL') setQuickTemplate(value);
    else setQuickTemplate('177'); 
  };

  const handleTemplateChange = (value) => {
    setQuickTemplate(value);
    setStageFilter(value); 
  };

  const handleQuickSubmit = async () => {
    if (!quickName || !quickEmail) return alert("Please enter both Name and Email");
    await onQuickSend(quickName, quickEmail, quickTemplate);
    setQuickName(''); 
    setQuickEmail('');
    setIsQuickLaunchOpen(false);
  };

  const toggleFilter = (filterName) => {
    setStatusFilter(prev => prev === filterName ? 'ALL' : filterName);
  };

  // --- STRICT PARSER FOR SENT VS DELIVERED ---
  const parseStatus = (reportStr, activeStage = 'ALL') => {
    if (!reportStr) return { sent: false, delivered: false, openCount: 0, clickCount: 0, source: '-', date: '-' };
    
    const parts = reportStr.split('|').map(p => p.trim());
    const stageData = parts[0] || ""; 
    const reportUpper = reportStr.toUpperCase();
    
    let openCount = 0;
    let clickCount = 0;
    let hasBrackets = false;

    if (activeStage === 'ALL') {
      const matches = [...stageData.matchAll(/O(\d+),C(\d+)/g)];
      if (matches.length > 0) {
        hasBrackets = true;
        for (const match of matches) {
          openCount += parseInt(match[1]);
          clickCount += parseInt(match[2]);
        }
      } else {
        if (reportUpper.includes('OPEN')) {
          const m = stageData.match(/\((\d+)\)/);
          openCount = m ? parseInt(m[1]) : 1;
        }
        if (reportUpper.includes('CLICK')) {
          const m = stageData.match(/\((\d+)\)/);
          clickCount = m ? parseInt(m[1]) : 1;
        }
      }
    } else {
      const regex = new RegExp(`\\[${activeStage}:O(\\d+),C(\\d+)\\]`);
      const match = stageData.match(regex);
      if (match) {
        hasBrackets = true;
        openCount = parseInt(match[1]);
        clickCount = parseInt(match[2]);
      }
    }

    const isDelivered = reportUpper.includes('DELIVERED') || openCount > 0 || clickCount > 0;
    const isSent = (reportUpper.includes('SENT') || isDelivered || hasBrackets) && !reportUpper.includes('REJECTED');

    const rawDate = parts[1] || '-';
    let formattedDate = rawDate;
    if (rawDate !== '-' && !rawDate.toLowerCase().includes('m') && rawDate.includes('-')) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('en-IN', {
            month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
          });
        }
      } catch (e) {}
    }

    return {
      sent: isSent,
      delivered: isDelivered,
      openCount,
      clickCount,
      date: formattedDate,
      source: parts[2] || 'Batch'
    };
  };

  const displayedCampaignData = useMemo(() => {
    const filteredData = campaignData.filter(lead => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        lead.companyName?.toLowerCase().includes(search) ||
        lead.contactPerson?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;

      const report = (lead.campaignReport || "").toUpperCase();
      const stats = parseStatus(lead.campaignReport, stageFilter);

      if (stageFilter === '177' && !report) return false; 
      if (stageFilter === '178' && !report.includes('178') && !report.includes('179')) return false;
      if (stageFilter === '179' && !report.includes('179')) return false;

      if (openMin !== 'ALL') {
        const val = parseInt(openMin);
        if (openMin === '5') { if (stats.openCount < 5) return false; } 
        else { if (stats.openCount !== val) return false; }
      }

      if (clickMin !== 'ALL') {
        const val = parseInt(clickMin);
        if (clickMin === '5') { if (stats.clickCount < 5) return false; } 
        else { if (stats.clickCount !== val) return false; }
      }

      return true;
    });

    return filteredData.sort((a, b) => {
      const dateStrA = a.campaignReport ? a.campaignReport.split('|')[1]?.trim() : '';
      const dateStrB = b.campaignReport ? b.campaignReport.split('|')[1]?.trim() : '';
      const timeA = new Date(dateStrA).getTime();
      const timeB = new Date(dateStrB).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });
  }, [campaignData, searchTerm, stageFilter, openMin, clickMin]);

  const funnel = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const baseData = data.filter(lead => {
      const reportStr = (lead.campaignReport || "").toUpperCase();
      if (!reportStr || !reportStr.includes('|')) return false;
      
      const datePart = lead.campaignReport.split('|')[1]?.trim();
      const justDateStr = datePart ? new Date(datePart).toISOString().split('T')[0] : '';
      
      if (reportType === 'DAILY' && justDateStr !== today) return false;
      if (reportType === 'WEEKLY' && new Date(datePart) < oneWeekAgo) return false;
      if (reportType === 'CUSTOM' && customDateRange?.start && customDateRange?.end) {
        const start = new Date(customDateRange.start);
        const end = new Date(customDateRange.end);
        const current = new Date(justDateStr);
        if (current < start || current > end) return false;
      }

      if (stageFilter === '177' && !reportStr) return false;
      if (stageFilter === '178' && !reportStr.includes('178') && !reportStr.includes('179')) return false;
      if (stageFilter === '179' && !reportStr.includes('179')) return false;

      return true;
    });

    return {
      sent: baseData.filter(l => parseStatus(l.campaignReport, stageFilter).sent).length,
      delivered: baseData.filter(l => parseStatus(l.campaignReport, stageFilter).delivered).length,
      opened: baseData.filter(l => {
        const s = parseStatus(l.campaignReport, stageFilter);
        if (openMin === 'ALL') return s.openCount > 0;
        const val = parseInt(openMin);
        return openMin === '5' ? s.openCount >= 5 : s.openCount === val;
      }).length,
      clicked: baseData.filter(l => {
        const s = parseStatus(l.campaignReport, stageFilter);
        if (clickMin === 'ALL') return s.clickCount > 0;
        const val = parseInt(clickMin);
        return clickMin === '5' ? s.clickCount >= 5 : s.clickCount === val;
      }).length
    };
  }, [data, reportType, customDateRange, stageFilter, openMin, clickMin]);

  const statConfig = [
    { label: 'Sent', val: funnel.sent, icon: SendHorizontal, key: 'SENT', activeClass: 'ring-blue-500 bg-blue-50/50', text: 'text-blue-600' },
    { label: 'Delivered', val: funnel.delivered, icon: Inbox, key: 'DELIVERED', activeClass: 'ring-teal-500 bg-teal-50/50', text: 'text-teal-600' },
    { label: 'Opened', val: funnel.opened, icon: Eye, key: 'OPENED', activeClass: 'ring-green-500 bg-green-50/50', text: 'text-green-600' },
    { label: 'Clicked', val: funnel.clicked, icon: MousePointerClick, key: 'CLICKED', activeClass: 'ring-purple-500 bg-purple-50/50', text: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end w-full -mt-[64px] mb-[24px] relative z-5 pointer-events-none">
        <Button onClick={() => setIsQuickLaunchOpen(true)} className="bg-[#1A4486] hover:bg-[#1A4486]/90 text-white font-bold h-10 px-5 text-sm gap-2 shadow-md transition-all rounded-md pointer-events-auto">
          <Rocket className="h-4 w-4 text-[#FBD407]" />
          Quick Send
        </Button>
      </div>

      {isQuickLaunchOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-xl">
            <div className="bg-[#1A4486] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-[#FBD407]" />
                <span className="text-sm font-black text-[#FBD407] uppercase tracking-widest">Quick Send Lead</span>
              </div>
              <button onClick={() => setIsQuickLaunchOpen(false)} className="text-white/70 hover:text-[#FBD407]"><X className="h-5 w-5" /></button>
            </div>
            <CardContent className="p-6 flex flex-col gap-5 bg-white">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#1A4486] uppercase ml-1">Contact Name</label>
                <Input placeholder="Name..." className="h-10 bg-slate-50 text-sm" value={quickName} onChange={(e) => setQuickName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#1A4486] uppercase ml-1">Email Address</label>
                <Input placeholder="Email..." className="h-10 bg-slate-50 text-sm" value={quickEmail} onChange={(e) => setQuickEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#1A4486] uppercase ml-1">Select Template</label>
                <Select value={quickTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full h-10 text-sm font-bold bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="177">Initial Pitch (177)</SelectItem>
                    <SelectItem value="178">Follow-up 1 (178)</SelectItem>
                    <SelectItem value="179">Follow-up 2 (179)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2 pt-5 border-t">
                <Button variant="ghost" onClick={() => setIsQuickLaunchOpen(false)}>Cancel</Button>
                <Button onClick={handleQuickSubmit} disabled={isSyncing || !quickName || !quickEmail} className="bg-[#FBD407] hover:bg-[#e0be06] text-[#1A4486] font-black">
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Fire Template {quickTemplate}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statConfig.map((item) => (
          <Card key={item.label} onClick={() => toggleFilter(item.key)} className={`cursor-pointer transition-all border shadow-sm ${statusFilter === item.key ? `ring-2 ${item.activeClass} border-transparent` : 'hover:bg-slate-50 border-slate-200'}`}>
            <CardHeader className="py-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-[10px] font-black uppercase ${statusFilter === item.key ? item.text : 'text-slate-500'}`}>{item.label}</CardTitle>
              <item.icon className={`h-4 w-4 ${statusFilter === item.key ? item.text : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent><div className={`text-2xl font-black ${statusFilter === item.key ? item.text : 'text-slate-900'}`}>{item.val}</div></CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={onSync} disabled={isSyncing} className="h-full border-2 border-dashed border-slate-200 flex flex-col gap-1 items-center justify-center min-h-[90px] bg-white hover:border-[#1A4486]">
          {isSyncing ? <Loader2 className="h-5 w-5 animate-spin text-[#1A4486]" /> : <Calendar className="h-5 w-5 text-slate-400" />}
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Sync Reports</span>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b flex flex-col lg:flex-row justify-between items-center gap-4 px-4 py-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
              {['DAILY', 'WEEKLY', 'FULL', 'CUSTOM'].map((type) => (
                <Button key={type} size="sm" onClick={() => setReportType(type)} className={`text-[10px] font-bold px-4 h-7 rounded-md ${reportType === type ? 'bg-[#FBD407] text-[#1A4486]' : 'text-slate-600 bg-transparent hover:bg-slate-200'}`}>
                  {type === 'FULL' ? 'ALL TIME' : type === 'DAILY' ? 'TODAY' : type}
                </Button>
              ))}
            </div>
            {reportType === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
                <Input type="date" value={customDateRange?.start || ''} onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} className="h-8 w-[140px] text-xs font-medium bg-white cursor-pointer" />
                <span className="text-[9px] font-black text-slate-400 uppercase">To</span>
                <Input type="date" value={customDateRange?.end || ''} onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} className="h-8 w-[140px] text-xs font-medium bg-white cursor-pointer" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 min-w-[150px] lg:w-48 pt-4">
               <label className="absolute top-0 left-1 text-[9px] font-black text-slate-400 uppercase">Search</label>
               <Search className="absolute left-2.5 top-[70%] -translate-y-1/2 h-3 w-3 text-slate-400" />
               <Input placeholder="Lead name..." className="pl-8 h-8 text-[10px] bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             
             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Campaign</label>
               <Select value={stageFilter} onValueChange={handleStageChange}>
                 <SelectTrigger className="w-32 h-8 text-[10px] font-bold uppercase bg-white"><SelectValue placeholder="Campaign" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL" className="font-bold">All Campaigns</SelectItem>
                   <SelectItem value="177">Initial (177)</SelectItem>
                   <SelectItem value="178">F-Up 1 (178)</SelectItem>
                   <SelectItem value="179">F-Up 2 (179)</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Opens</label>
               <Select value={openMin} onValueChange={setOpenMin}>
                 <SelectTrigger className="w-24 h-8 text-[10px] font-bold uppercase bg-white"><SelectValue placeholder="Opens" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">Opens</SelectItem>
                   <SelectItem value="1">1 Open</SelectItem>
                   <SelectItem value="2">2 Opens</SelectItem>
                   <SelectItem value="3">3 Opens</SelectItem>
                   <SelectItem value="4">4 Opens</SelectItem>
                   <SelectItem value="5">5+ Opens</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Clicks</label>
               <Select value={clickMin} onValueChange={setClickMin}>
                 <SelectTrigger className="w-24 h-8 text-[10px] font-bold uppercase bg-white"><SelectValue placeholder="Clicks" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">Clicks</SelectItem>
                   <SelectItem value="1">1 Click</SelectItem>
                   <SelectItem value="2">2 Clicks</SelectItem>
                   <SelectItem value="3">3 Clicks</SelectItem>
                   <SelectItem value="4">4 Clicks</SelectItem>
                   <SelectItem value="5">5+ Clicks</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status</label>
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger className="w-32 h-8 text-[10px] font-bold uppercase bg-white"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">All Events</SelectItem>
                   <SelectItem value="SENT">Sent</SelectItem>
                   <SelectItem value="DELIVERED">Delivered</SelectItem>
                   <SelectItem value="OPENED">Opened</SelectItem>
                   <SelectItem value="CLICKED">Clicked</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[10px] font-black pl-6 py-4 uppercase text-slate-500">Target Lead</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Delivered</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Opens</TableHead>
                <TableHead className="text-[10px] font-black text-center uppercase text-slate-500">Clicks</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Source</TableHead>
                <TableHead className="text-[10px] font-black text-right pr-6 uppercase text-slate-500">Activity Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCampaignData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs italic">No activity found for these filters.</TableCell></TableRow>
              ) : (
                displayedCampaignData.map(lead => {
                  const p = parseStatus(lead.campaignReport, stageFilter);
                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => onSelectContact(lead)}>
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-slate-900 leading-tight">{lead.companyName || lead.contactPerson || "Unknown"}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{lead.email}</div>
                      </TableCell>
                      <TableCell className="text-center">{p.delivered ? <div className="flex justify-center"><CheckCircle2 className="h-4 w-4 text-teal-500" /></div> : <Minus className="h-4 w-4 text-slate-200 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{p.openCount > 0 ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-black text-[10px] px-2 h-5 rounded-md">{p.openCount}</Badge> : <Minus className="h-4 w-4 text-slate-200 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{p.clickCount > 0 ? <Badge className="bg-purple-600 text-white font-black text-[10px] px-2 h-5 border-none rounded-md">{p.clickCount}</Badge> : <Minus className="h-4 w-4 text-slate-200 mx-auto" />}</TableCell>
                      <TableCell><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${p.source.toLowerCase().includes('quick') ? 'text-[#1A4486] bg-blue-50 border-[#1A4486]/30' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>{p.source}</span></TableCell>
                      <TableCell className="text-right pr-6 font-mono text-[10px] text-slate-600 font-bold whitespace-nowrap">{p.date}</TableCell>
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

export default CampaignsTab;