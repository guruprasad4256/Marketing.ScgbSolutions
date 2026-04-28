import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Mail, MousePointerClick, CheckCircle2, Eye, 
  Calendar, Rocket, Database, TrendingUp, Filter, History 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const DashboardTab = ({ data = [] }) => {
  const [timeframe, setTimeframe] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all'); // all, initial, followup1, followup2
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // --- SAFETY PARSER ---
  const parseLead = (lead) => {
    if (!lead || !lead.campaignReport || typeof lead.campaignReport !== 'string' || !lead.campaignReport.includes('|')) {
        return null;
    }
    
    try {
        const parts = lead.campaignReport.split('|').map(p => p.trim());
        const rawStatus = (parts[0] || "").toUpperCase();
        const date = parts[1] || "";
        const source = parts[2] || 'Batch';

        const extractCount = (str) => {
          const match = str.match(/\((\d+)\)/);
          return match ? parseInt(match[1]) : 1;
        };

        const clicked = rawStatus.includes('CLICK');
        const opened = rawStatus.includes('OPEN') || clicked;
        const delivered = rawStatus.includes('DELIVERED') || rawStatus.includes('SENT') || opened;

        return {
          date,
          source,
          isDelivered: delivered,
          isOpened: opened,
          isClicked: clicked,
          openCount: opened ? extractCount(rawStatus) : 0,
          clickCount: clicked ? extractCount(rawStatus) : 0
        };
    } catch (e) {
        return null;
    }
  };

  // --- 1. FILTERED DATA (Expanded for 178 & 179) ---
  const filteredCampaigns = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    return data.map(parseLead).filter(item => {
      if (!item || !item.date) return false;

      // Campaign Type Filter Logic
      const src = item.source.toUpperCase();
      if (campaignFilter === 'initial' && (src.includes('178') || src.includes('179'))) return false;
      if (campaignFilter === 'followup1' && !src.includes('178')) return false;
      if (campaignFilter === 'followup2' && !src.includes('179')) return false;

      // Timeframe Filter
      if (timeframe === 'all') return true;
      if (timeframe === 'today') return item.date === todayStr;

      const reportDate = new Date(item.date);
      const now = new Date();
      if (timeframe === 'last7') {
        const limit = new Date(); limit.setDate(now.getDate() - 7);
        return reportDate >= limit;
      }
      if (timeframe === 'last30') {
        const limit = new Date(); limit.setDate(now.getDate() - 30);
        return reportDate >= limit;
      }
      if (timeframe === 'custom' && customRange.start && customRange.end) {
        return item.date >= customRange.start && item.date <= customRange.end;
      }
      return true;
    });
  }, [data, timeframe, campaignFilter, customRange]);

  // --- 2. STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalSent = filteredCampaigns.length;
    const totalDelivered = filteredCampaigns.filter(l => l.isDelivered).length;
    const totalOpened = filteredCampaigns.filter(l => l.isOpened).length;
    const totalClicked = filteredCampaigns.filter(l => l.isClicked).length;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0",
      clickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : "0.0",
      quickSendCount: filteredCampaigns.filter(l => l.source.toLowerCase().includes('quick')).length,
      automationCount: filteredCampaigns.filter(l => l.source.toLowerCase().includes('batch') || l.source.toLowerCase().includes('follow-up')).length,
    };
  }, [filteredCampaigns]);

  // --- 3. CHART DATA ---
  const trendData = useMemo(() => {
    const groups = {};
    filteredCampaigns.forEach(l => {
      if (!l.date) return;
      if (!groups[l.date]) groups[l.date] = { date: l.date, sent: 0, actions: 0 };
      groups[l.date].sent++;
      groups[l.date].actions += (l.openCount + l.clickCount);
    });
    return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredCampaigns]);

  const pieData = [
    { name: 'Clicks', value: stats.totalClicked, color: '#a855f7' },
    { name: 'Opens', value: Math.max(0, stats.totalOpened - stats.totalClicked), color: '#22c55e' },
    { name: 'Delivered', value: Math.max(0, stats.totalDelivered - stats.totalOpened), color: '#14b8a6' },
    { name: 'Sent', value: Math.max(0, stats.totalSent - stats.totalDelivered), color: '#3b82f6' },
  ];

  const getBadgeStyle = () => {
      if (campaignFilter === 'initial') return 'border-blue-200 text-blue-600 bg-blue-50';
      if (campaignFilter === 'followup1') return 'border-orange-200 text-orange-600 bg-orange-50';
      if (campaignFilter === 'followup2') return 'border-purple-200 text-purple-600 bg-purple-50';
      return 'border-slate-200 text-slate-600 bg-slate-50';
  }

  return (
    <div className="space-y-6 pb-10">
      {/* UPDATED FILTER BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Intelligence Overview</span>
            </div>
            <Badge variant="outline" className={`text-[10px] font-black ${getBadgeStyle()}`}>
                {campaignFilter === 'all' ? 'ALL DATA' : campaignFilter.toUpperCase().replace('FOLLOWUP', 'F-UP ')}
            </Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* CAMPAIGN TYPE SELECT (UPDATED) */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-52 border-none bg-transparent font-bold text-[10px] h-7 uppercase">
                    <div className="flex items-center gap-2">
                        <Filter className="h-3 w-3" />
                        <SelectValue placeholder="Campaign Type" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    <SelectItem value="initial">Initial Outreach (177)</SelectItem>
                    <SelectItem value="followup1">Warm Follow-up 1 (178)</SelectItem>
                    <SelectItem value="followup2">Warm Follow-up 2 (179)</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* TIMEFRAME SELECT */}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36 bg-slate-50 border-none font-bold text-[10px] h-8 uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border animate-in fade-in zoom-in duration-200">
              <Input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="h-7 w-32 text-[10px] border-none bg-transparent font-bold" />
              <span className="text-[10px] font-black text-slate-300">TO</span>
              <Input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="h-7 w-32 text-[10px] border-none bg-transparent font-bold" />
            </div>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
            { label: 'Total Leads', val: data.length, icon: Users, color: 'text-slate-400' },
            { label: 'Sent', val: stats.totalSent, icon: Mail, color: 'text-blue-500' },
            { label: 'Delivered', val: stats.totalDelivered, icon: CheckCircle2, color: 'text-teal-500' },
            { label: 'Opened', val: stats.totalOpened, icon: Eye, color: 'text-green-500' },
            { label: 'Clicked', val: stats.totalClicked, icon: MousePointerClick, color: 'text-purple-500' },
        ].map(item => (
            <Card key={item.label} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="py-3 pb-1 flex flex-row items-center justify-between space-y-0">
                    <span className="text-[10px] font-black uppercase text-slate-400">{item.label}</span>
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </CardHeader>
                <CardContent><div className="text-2xl font-black">{item.val}</div></CardContent>
            </Card>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white min-h-[350px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-black flex items-center gap-2 uppercase text-slate-500 tracking-widest">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Engagement Trend 
              <span className="text-[10px] lowercase font-medium opacity-50 ml-1">({campaignFilter} data)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} dy={10} stroke="#94a3b8" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                <Line name="Sent" type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line name="Interactions" type="monotone" dataKey="actions" stroke="#22c55e" strokeWidth={4} dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white min-h-[350px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center">
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase">Open Rate</p>
                <p className="text-xl font-black text-green-600">{stats.openRate}%</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase">Click Rate</p>
                <p className="text-xl font-black text-purple-600">{stats.clickRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOURCE & HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader><CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Campaign Mix</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-around py-8">
            <div className="text-center group">
              <div className="h-14 w-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-orange-100">
                <Rocket className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.quickSendCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Quick Sends</p>
            </div>
            <div className="h-16 w-px bg-slate-100"></div>
            <div className="text-center group">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.automationCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Automated Batches</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader><CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Recent Performance Snapshot</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-black pl-6 uppercase">Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Volume</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Interactions</TableHead>
                  <TableHead className="text-[10px] font-black text-right pr-6 uppercase">Action Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendData.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-300 text-[10px] uppercase font-black italic tracking-widest">No matching campaign data</TableCell></TableRow>
                ) : (
                    trendData.slice().reverse().slice(0, 5).map((day, i) => (
                    <TableRow key={i} className="text-xs hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="font-bold pl-6 text-slate-600">{day.date}</TableCell>
                        <TableCell className="font-medium">{day.sent}</TableCell>
                        <TableCell className="text-green-600 font-black">{day.actions}</TableCell>
                        <TableCell className="text-right pr-6">
                            <Badge className="bg-slate-900 text-[9px] font-black px-2 py-0">
                                {day.sent > 0 ? ((day.actions / day.sent) * 100).toFixed(0) : 0}%
                            </Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardTab;