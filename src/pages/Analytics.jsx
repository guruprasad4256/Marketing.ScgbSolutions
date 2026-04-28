import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, Users, Target, Clock, Calendar as ShadCalender, DollarSign, Zap, Eye, Globe, X } from 'lucide-react';
import * as RechartsPrimitive from 'recharts';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/CreatePage';
import KPICard from '@/components/KPICard';
import StickySearchHeader from '@/components/StickySearchHeader';
import { api } from '@/utils/Api';
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

const parseSheetDate = (value) => {
  if (!value) return null;

  // Supports: DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const [datePart, timePart] = value.split(" ");
  const [dd, mm, yyyy] = datePart.split("/");

  if (!dd || !mm || !yyyy) return null;

  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    ...(timePart ? timePart.split(":").map(Number) : [0, 0, 0])
  );
};

const normalizeLead = (lead) => {
  const rawDate = lead.Date || lead.date || lead.createdAt;

  return {
    id: lead.Id || lead._rowNumber || "",
    date: parseSheetDate(rawDate),
    stage: lead.Stage || lead.stage || '',
    funnel: lead.Funnel || lead.funnel || '',
    followUpBy: lead.followUpBy || lead["Followup By"] || "",
    name: lead.Name || lead.name || '',
    contact: lead['Phone Number'] || lead.contact || '',
    email: lead.Email || lead.email || '',
    companyName: lead['Company Name'] || lead.companyName || '',
    industry: lead['Industry'] || lead.Industry || '',
    query: lead.Query || lead.query || ''
  };
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState([]);
  const [dateFilter, setDateFilter] = useState("overall");
  const [budgets, setBudgets] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [filterRange, setFilterRange] = useState({
    from: null,
    to: null
  });
  const [analytics, setAnalytics] = useState({
    funnelData: [],
    leadDropOffs: [],
    timeOfDayData: [],
    dayOfWeekData: [],
    leadVelocity: { avgDailyLeads: '0', totalLeads: 0, trend: [] },
    agentPerformance: [],
    sourceEfficiency: [],
    conversionTrends: [],
    stageMetrics: []
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {

        const [leadRes, budgetRes] = await Promise.all([
          api.get('/api/leads'),
          api.get('/api/leads/budget')
        ]);

        const rawLeads = Array.isArray(leadRes.data?.data)
          ? leadRes.data.data
          : [];

        const normalized = rawLeads
          .map(normalizeLead)
          .filter(l => l.date instanceof Date && !isNaN(l.date));

        setAllLeads(normalized);
        setBudgets(budgetRes.data?.data || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const campaignOptions = useMemo(() => {
    const unique = [...new Set(
      budgets
        .map(b => b.campaignName)
        .filter(Boolean)
    )];

    return unique.sort();
  }, [budgets]);

  const applyShortcut = (type) => {
    const now = new Date();
    let from = null;
    let to = new Date();

    switch (type) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        break;

      case "yesterday":
        from = new Date();
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);

        to = new Date();
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;

      case "7":
        from = new Date();
        from.setDate(from.getDate() - 7);
        break;

      case "15":
        from = new Date();
        from.setDate(from.getDate() - 15);
        break;

      case "1m":
        from = new Date();
        from.setMonth(from.getMonth() - 1);
        break;

      case "3m":
        from = new Date();
        from.setMonth(from.getMonth() - 3);
        break;

      case "6m":
        from = new Date();
        from.setMonth(from.getMonth() - 6);
        break;

      case "12m":
        from = new Date();
        from.setMonth(from.getMonth() - 12);
        break;

      case "overall":
        from = null;
        to = null;
        break;
    }

    setFilterRange({ from, to });
  };

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {

      if (selectedCampaigns.length > 0 &&
        !selectedCampaigns.includes(b.campaignName)) {
        return false;
      }

      if (filterRange?.from) {
        if (new Date(b.reportingStart) < filterRange.from)
          return false;
      }

      if (filterRange?.to) {
        const to = new Date(filterRange.to);
        to.setHours(23, 59, 59, 999);

        if (new Date(b.reportingStart) > to)
          return false;
      }

      return true;

    });
  }, [budgets, selectedCampaigns, filterRange]);

  const campaignDateRanges = useMemo(() => {
    if (selectedCampaigns.length === 0) return [];

    return budgets
      .filter(b => selectedCampaigns.includes(b.campaignName))
      .map(b => {
        const start = new Date(b.reportingStart);
        const end = new Date(b.reportingEnd || b.reportingStart);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
      });

  }, [selectedCampaigns, budgets]);

  const filteredLeads = useMemo(() => {

    // 1️⃣ Build date → campaign map from budgets
    const dateCampaignMap = {};

    budgets.forEach((b) => {
      const date = new Date(b.reportingStart)
        .toISOString()
        .split("T")[0];

      const campaign = b.campaignName || "Unknown";

      dateCampaignMap[date] = campaign;
    });

    return allLeads.filter((lead) => {

      const leadDate = new Date(lead.date)
        .toISOString()
        .split("T")[0];

      // 2️⃣ Campaign filter
      if (selectedCampaigns.length > 0) {
        const campaignForDate = dateCampaignMap[leadDate];

        if (!campaignForDate || !selectedCampaigns.includes(campaignForDate)) {
          return false;
        }
      }

      // 3️⃣ Manual date filter
      if (filterRange?.from) {
        const from = new Date(filterRange.from);
        from.setHours(0, 0, 0, 0);
        if (lead.date < from) return false;
      }

      if (filterRange?.to) {
        const to = new Date(filterRange.to);
        to.setHours(23, 59, 59, 999);
        if (lead.date > to) return false;
      }

      return true;

    });

  }, [allLeads, budgets, selectedCampaigns, filterRange]);

  // Recalculate analytics whenever leads or date range change
  useEffect(() => {
    if (allLeads.length > 0) {
      const analyticsData = calculateAnalytics(filteredLeads);
      setAnalytics(analyticsData);
    }
  }, [filteredLeads, dateFilter, filterRange]);

  const calculateAnalytics = (leads) => {
    if (!leads || leads.length === 0) {
      return {
        funnelData: [],
        leadDropOffs: [],
        timeOfDayData: [],
        dayOfWeekData: [],
        leadVelocity: { avgDailyLeads: '0', totalLeads: 0, trend: [] },
        agentPerformance: [],
        sourceEfficiency: [],
        conversionTrends: [],
        stageMetrics: []
      };
    }

    let leadsToAnalyze = [];
    let cutoffDate = null;

    if (dateFilter === "overall") {
      leadsToAnalyze = leads;
    }
    else if (dateFilter === "custom" && filterRange?.from && filterRange?.to) {
      const from = new Date(filterRange.from);
      const to = new Date(filterRange.to);
      to.setHours(23, 59, 59, 999);

      leadsToAnalyze = leads.filter(
        l => l.date >= from && l.date <= to
      );

      cutoffDate = from;
    }
    else {
      cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(dateFilter));

      leadsToAnalyze = leads.filter(l => l.date >= cutoffDate);
    }

    // Funnel Data
    const funnelStages = ['Lead', 'MQL', 'SQL', 'Advanced SQL', 'Discovery', 'Won'];
    const funnelCounts = funnelStages.map(stage => {
      const count = leadsToAnalyze.filter(l => {
        const leadStage = l.stage || '';
        if (stage === 'Lead') return true;
        if (stage === 'MQL') return leadStage.includes('MQL');
        if (stage === 'SQL') return leadStage.includes('SQL') && !leadStage.includes('Advanced');
        if (stage === 'Advanced SQL') return leadStage.includes('Advanced SQL');
        if (stage === 'Discovery') return leadStage.includes('Discovery');
        if (stage === 'Won') return leadStage.includes('Won');
        return false;
      }).length;
      return { stage, count };
    });

    const funnelData = funnelCounts.map((item, index) => {
      const prevCount = index > 0 ? funnelCounts[index - 1].count : leadsToAnalyze.length;
      const conversionRate = prevCount > 0 ? ((item.count / prevCount) * 100).toFixed(1) : 0;
      return { stage: item.stage, count: item.count, conversionRate: parseFloat(conversionRate) };
    });

    // --- Lead Drop-offs ---
    const leadDropOffs = funnelData.map((item, index) => {
      const prevCount = index > 0 ? funnelData[index - 1].count : leadsToAnalyze.length;
      const dropOff = prevCount - item.count;
      const dropOffRate = prevCount > 0 ? ((dropOff / prevCount) * 100).toFixed(1) : 0;
      return { stage: item.stage, dropOff, dropOffRate: parseFloat(dropOffRate) };
    });

    // Time of Day
    const timeOfDayData = Array.from({ length: 24 }, (_, hour) => {
      const leadsAtHour = leadsToAnalyze.filter(l => l.date.getHours() === hour);
      const sqlCount = leadsAtHour.filter(l => l.stage?.includes('SQL')).length;
      const convRate = leadsAtHour.length > 0 ? ((sqlCount / leadsAtHour.length) * 100).toFixed(1) : 0;
      return { hour: `${hour}:00`, leads: leadsAtHour.length, sqls: sqlCount, conversionRate: parseFloat(convRate) };
    });

    // Day of Week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekData = dayNames.map((day, index) => {
      const leadsOnDay = leadsToAnalyze.filter(l => l.date.getDay() === index);
      const sqlCount = leadsOnDay.filter(l => l.stage?.includes('SQL')).length;
      const convRate = leadsOnDay.length > 0 ? ((sqlCount / leadsOnDay.length) * 100).toFixed(1) : 0;
      return { day, leads: leadsOnDay.length, sqls: sqlCount, conversionRate: parseFloat(convRate) };
    });

    let daysDiff = 30;

    if (cutoffDate) {
      daysDiff = Math.ceil(
        (new Date() - cutoffDate) / (1000 * 60 * 60 * 24)
      );
    } else if (leadsToAnalyze.length > 0) {
      const oldestLead = leadsToAnalyze.reduce(
        (min, l) => l.date < min ? l.date : min,
        leadsToAnalyze[0].date
      );

      daysDiff = Math.ceil(
        (new Date() - oldestLead) / (1000 * 60 * 60 * 24)
      );
    }

    const dailyLeads = [];

    for (let i = daysDiff - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const leadsOnDate = leadsToAnalyze.filter(
        l => l.date.toISOString().split('T')[0] === dateStr
      );

      dailyLeads.push({ date: dateStr, count: leadsOnDate.length });
    }

    const avgDailyLeads =
      daysDiff > 0
        ? dailyLeads.reduce((sum, d) => sum + d.count, 0) / daysDiff
        : 0;

    const leadVelocity = {
      avgDailyLeads: avgDailyLeads.toFixed(1),
      totalLeads: leadsToAnalyze.length,
      trend: dailyLeads
    };

    // Agent Performance
    const agents = [...new Set(leadsToAnalyze.map(l => l.followUpBy).filter(Boolean))];
    const agentPerformance = agents.map(agent => {
      const agentLeads = leadsToAnalyze.filter(l => l.followUpBy === agent);
      const sqlLeads = agentLeads.filter(l => l.stage?.includes('SQL'));
      return { agent, leads: agentLeads.length, sqls: sqlLeads.length, conversionRate: agentLeads.length ? ((sqlLeads.length / agentLeads.length) * 100).toFixed(1) : 0 };
    }).sort((a, b) => b.conversionRate - a.conversionRate);
    console.log(analytics.agentPerformance);

    // Source Efficiency
    const sources = [...new Set(leadsToAnalyze.map(l => l.funnel).filter(Boolean))];
    const sourceEfficiency = sources.map(source => {
      const sourceLeads = leadsToAnalyze.filter(l => l.funnel === source);
      const sqlLeads = sourceLeads.filter(l => l.stage?.includes('SQL'));
      return { source, leads: sourceLeads.length, sqls: sqlLeads.length, conversionRate: sourceLeads.length ? ((sqlLeads.length / sourceLeads.length) * 100).toFixed(1) : 0 };
    }).sort((a, b) => b.conversionRate - a.conversionRate);

    // Conversion Trends (weekly)
    const weeks = Math.ceil(daysDiff / 7);
    const conversionTrends = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weeks - i) * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekLeads = leadsToAnalyze.filter(l => l.date >= weekStart && l.date < weekEnd);
      const sqlCount = weekLeads.filter(l => l.stage?.includes('SQL')).length;
      const convRate = weekLeads.length ? ((sqlCount / weekLeads.length) * 100).toFixed(1) : 0;
      conversionTrends.push({ week: `Week ${i + 1}`, leads: weekLeads.length, sqls: sqlCount, conversionRate: parseFloat(convRate) });
    }

    // Stage Metrics
    const stages = [...new Set(leadsToAnalyze.map(l => l.stage).filter(Boolean))];
    const stageMetrics = stages.map(stage => {
      const stageLeads = leadsToAnalyze.filter(l => l.stage === stage);
      return { stage, count: stageLeads.length, percentage: ((stageLeads.length / leadsToAnalyze.length) * 100).toFixed(1) };
    }).sort((a, b) => b.count - a.count);

    return { funnelData, timeOfDayData, dayOfWeekData, leadVelocity, agentPerformance, sourceEfficiency, conversionTrends, stageMetrics, leadDropOffs };
  };

  const reachComparison = useMemo(() => {

    return filteredBudgets
      .filter(b => {
        const reach = Number(b.reach || 0);
        const impressions = Number(b.impressions || 0);

        return reach > 0 || impressions > 0;
      })
      .map(b => ({
        campaign: b.campaignName,
        reach: Number(b.reach || 0),
        impressions: Number(b.impressions || 0),
        date: b.reportingStart   // 👈 add date
      }));

  }, [filteredBudgets]);

  const campaignPerformance = useMemo(() => {
    const campaignMap = {};
    const dateCampaignMap = {};

    // 1️⃣ Build campaign data + date → campaign lookup
    filteredBudgets.forEach((b) => {
      const campaign = b.campaignName || "Unknown";
      const date = new Date(b.reportingStart).toISOString().split("T")[0];

      if (!campaignMap[campaign]) {
        campaignMap[campaign] = {
          campaign,
          spent: 0,
          reach: 0,
          leads: 0
        };
      }

      campaignMap[campaign].spent += Number(b.amountSpent || 0);
      campaignMap[campaign].reach += Number(b.reach || 0);

      // map date → campaign
      dateCampaignMap[date] = campaign;
    });

    // 2️⃣ Match leads by date
    filteredLeads.forEach((lead) => {
      const leadDate = new Date(lead.date).toISOString().split("T")[0];

      const campaign = dateCampaignMap[leadDate];

      if (campaign && campaignMap[campaign]) {
        campaignMap[campaign].leads += 1;
      }
    });

    return Object.values(campaignMap).filter(
      (c) => c.spent > 0 || c.reach > 0 || c.leads > 0
    );

  }, [filteredBudgets, filteredLeads]);

  const CampaignTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-white border rounded-md p-3 shadow">
          <p className="font-semibold">{data.campaign}</p>

          <p className="text-xs text-gray-500 mb-2">
            {data.date}
          </p>

          <p className="text-sm text-blue-600">
            Reach: {data.reach.toLocaleString()}
          </p>

          <p className="text-sm text-orange-500">
            Impressions: {data.impressions.toLocaleString()}
          </p>
        </div>
      );
    }

    return null;
  };

  const marketingKpis = useMemo(() => {

    const totalSpent = filteredBudgets.reduce(
      (sum, b) => sum + Number(b.amountSpent || 0), 0
    );

    const results = filteredBudgets.reduce(
      (sum, b) => sum + Number(b.results || 0), 0
    );

    const impressions = filteredBudgets.reduce(
      (sum, b) => sum + Number(b.impressions || 0), 0
    );

    const reach = filteredBudgets.reduce(
      (sum, b) => sum + Number(b.reach || 0), 0
    );

    const sqlLeads = filteredLeads.filter(l =>
      String(l.stage || "").toLowerCase().includes("sql")
    ).length;

    const sales = filteredLeads.filter(l =>
      String(l.stage || "").toLowerCase() === "won"
    ).length;

    const cpl = results ? totalSpent / results : 0;
    const cpsql = sqlLeads ? totalSpent / sqlLeads : 0;
    const cpsales = sales ? totalSpent / sales : 0;
    const roas = totalSpent ? sales / totalSpent : 0;

    return {
      totalSpent,
      results,
      impressions,
      reach,
      sales,
      sqlLeads,
      cpl,
      cpsql,
      cpsales,
      roas
    }

  }, [filteredBudgets, filteredLeads]);

  const exportToCSV = () => {
    if (!allLeads.length) return;
    const csvData = allLeads.map(lead => ({
      Date: lead.date,
      Name: lead.name,
      Contact: lead.contact,
      Company: lead.companyName,
      Email: lead.email,
      Funnel: lead.funnel,
      Stage: lead.stage,
      Industry: lead.industry,
      SalesAgent: lead.followUpBy,
      Query: lead.query
    }));
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  // Show empty state
  if (!loading && allLeads.length === 0) {
    return (
      <div className="min-h-screen">
        <StickySearchHeader />
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm" className="mb-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            </div>
          </div>
          <Card className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold mt-4">No Data Available</h2>
            <p className="text-muted-foreground mt-2">Leads data will appear here once available.</p>
          </Card>
        </div>
      </div>
    );
  }

  const totalLeads = analytics.leadVelocity.totalLeads;
  const sqlStages = [
    "SQL",
    "Advanced SQL",
    "Discovery Scheduled",
    "Discovery Done",
    "Quote",
    "Won",
    "SQL No Response",
    "Quote (Lost)",
    "SQL Not Interested",
    "Trial Subscribed",
    "Interested for Trial",
    "Shared the trial details No response",
    "SQL - Will connect later"
  ];

  const sqlLeads =
    analytics.stageMetrics
      ?.filter(s =>
        sqlStages.some(stage =>
          s.stage?.toLowerCase().includes(stage.toLowerCase())
        )
      )
      .reduce((sum, s) => sum + s.count, 0) || 0;

  const overallConvRate = totalLeads
    ? ((sqlLeads / totalLeads) * 100).toFixed(1)
    : 0;

  const clearFilters = () => {
    setSelectedCampaigns([]);
    setFilterRange({ from: null, to: null });
  };

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f43f5e",
    "#6366f1"
  ];

  return (
    <div className="min-h-screen">
      <StickySearchHeader />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground">Shopify-style marketing performance reports</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filters</CardTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              Clear Filters
            </Button>
          </CardHeader>

          <CardContent className="grid md:grid-cols-2 gap-6">

            {/* Campaign Multi Select */}
            <MultiSelectFilter
              title="Campaigns"
              options={campaignOptions}
              selected={selectedCampaigns}
              onChange={setSelectedCampaigns}
            />

            {/* Date Picker */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Date Range
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {filterRange?.from ? (
                      filterRange?.to ? (
                        <>
                          {format(filterRange.from, "PPP")} -{" "}
                          {format(filterRange.to, "PPP")}
                        </>
                      ) : (
                        format(filterRange.from, "PPP")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-4">
                  <div className="flex gap-6">

                    {/* Shortcuts */}
                    <div className="flex flex-col gap-2 min-w-[140px] pl-4">

                      <span className="text-xs text-muted-foreground mb-1">
                        Quick Ranges
                      </span>

                      <div
                        onClick={() => applyShortcut("today")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Today
                      </div>

                      <div
                        onClick={() => applyShortcut("yesterday")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Yesterday
                      </div>

                      <div
                        onClick={() => applyShortcut("7")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 7 Days
                      </div>

                      <div
                        onClick={() => applyShortcut("15")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 15 Days
                      </div>

                      <div
                        onClick={() => applyShortcut("1m")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 1 Month
                      </div>

                      <div
                        onClick={() => applyShortcut("3m")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 3 Months
                      </div>

                      <div
                        onClick={() => applyShortcut("6m")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 6 Months
                      </div>

                      <div
                        onClick={() => applyShortcut("12m")}
                        className="cursor-pointer text-sm hover:bg-muted px-2 py-1 rounded"
                      >
                        Last 12 Months
                      </div>

                      <div
                        onClick={() => applyShortcut("overall")}
                        className="cursor-pointer text-sm font-medium text-primary hover:bg-muted px-2 py-1 rounded"
                      >
                        Overall
                      </div>

                    </div>
                    {/* Calendar */}
                    <Calendar
                      mode="range"
                      selected={filterRange}
                      onSelect={setFilterRange}
                      numberOfMonths={2}
                    />

                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </CardContent>
        </Card>

        {/* Top KPIs */}
        <div className="grid gap-4 md:grid-cols-5">

          <KPICard
            title="Total Leads"
            value={totalLeads}
            subtitle={
              dateFilter === "overall"
                ? "All Time"
                : dateFilter === "custom"
                  ? "Custom Range"
                  : `Last ${dateFilter} month${dateFilter > 1 ? "s" : ""}`
            }
            icon={Users}
          />

          <KPICard
            title="SQL Leads"
            value={sqlLeads}
            subtitle="Sales Qualified"
            icon={Target}
          />

          <KPICard
            title="Conversion Rate"
            value={`${overallConvRate}%`}
            subtitle="Lead → SQL"
            icon={TrendingUp}
          />

          <KPICard
            title="Lead Velocity"
            value={analytics.leadVelocity.avgDailyLeads}
            subtitle="Avg leads / day"
            icon={Zap}
          />

          <KPICard
            title="Amount Spent"
            value={`₹${marketingKpis.totalSpent.toFixed(2)}`}
            subtitle="Ad spend"
            icon={DollarSign}
          />

          <KPICard
            title="CPL"
            value={`₹${marketingKpis.cpl.toFixed(2)}`}
            subtitle="Cost per Lead"
            icon={Users}
          />

          <KPICard
            title="CPSQL"
            value={`₹${marketingKpis.cpsql.toFixed(2)}`}
            subtitle="Cost per SQL"
            icon={Target}
          />

          <KPICard
            title="ROAS"
            value={marketingKpis.roas.toFixed(2)}
            subtitle="Return on Ad Spend"
            icon={TrendingUp}
          />

          <KPICard
            title="Impressions"
            value={marketingKpis.impressions?.toLocaleString()}
            subtitle="Total ad views"
            icon={Eye}
          />

          <KPICard
            title="Reach"
            value={marketingKpis.reach?.toLocaleString()}
            subtitle="Unique audience"
            icon={Globe}
          />

        </div>

        {/* Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.funnelData.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">{stage.count}</span>
                      {index > 0 && (
                        <Badge variant="outline" className="bg-green-50">
                          {stage.conversionRate}% conversion
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-8 rounded-full flex items-center justify-end pr-4 text-white font-medium"
                      style={{ width: `${(stage.count / analytics.funnelData[0].count) * 100}%` }}
                    >
                      {((stage.count / analytics.funnelData[0].count) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time-based Analysis */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lead Drop-off Between Stages
              </CardTitle>
            </CardHeader>

            <CardContent>
              <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
                <RechartsPrimitive.BarChart data={analytics.leadDropOffs}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                  <RechartsPrimitive.XAxis dataKey="stage" />
                  <RechartsPrimitive.YAxis />
                  <RechartsPrimitive.Tooltip
                    formatter={(value, name, props) => [
                      `${value} leads (${props.payload.dropOffRate}%)`,
                      "Dropped"
                    ]}
                  />
                  <RechartsPrimitive.Bar
                    dataKey="dropOff"
                    name="Leads Lost"
                    fill="#ef4444"
                  />
                </RechartsPrimitive.BarChart>
              </RechartsPrimitive.ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Day of Week Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShadCalender className="h-5 w-5" />
                Day of Week Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
                <RechartsPrimitive.BarChart data={analytics.dayOfWeekData}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                  <RechartsPrimitive.XAxis dataKey="day" />
                  <RechartsPrimitive.YAxis />
                  <RechartsPrimitive.Tooltip />
                  <RechartsPrimitive.Legend />
                  <RechartsPrimitive.Bar dataKey="leads" fill="#8884d8" name="Leads" />
                  <RechartsPrimitive.Bar dataKey="sqls" fill="#82ca9d" name="SQLs" />
                </RechartsPrimitive.BarChart>
              </RechartsPrimitive.ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Lead Velocity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Lead Velocity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
              <RechartsPrimitive.LineChart data={analytics.leadVelocity.trend}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis dataKey="date" />
                <RechartsPrimitive.YAxis />
                <RechartsPrimitive.Tooltip />
                <RechartsPrimitive.Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Daily Leads"
                />
              </RechartsPrimitive.LineChart>
            </RechartsPrimitive.ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance & Source Efficiency */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sales Agent Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sales Agent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.agentPerformance.length > 0 ? (
                <RechartsPrimitive.ResponsiveContainer width="100%" height={analytics.agentPerformance.length * 60}>
                  <RechartsPrimitive.BarChart
                    layout="vertical"
                    data={analytics.agentPerformance}
                    margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                  >
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <RechartsPrimitive.XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      stroke="#9ca3af"
                    />
                    <RechartsPrimitive.YAxis
                      type="category"
                      dataKey="agent"
                      width={150}
                      stroke="#9ca3af"
                    />
                    <RechartsPrimitive.Tooltip
                      formatter={(value, name, props) => [`${value}%`, 'Conversion']}
                    />
                    <RechartsPrimitive.Bar
                      dataKey="conversionRate"
                      fill="#3b82f6"
                      radius={[5, 5, 5, 5]}
                    />
                  </RechartsPrimitive.BarChart>
                </RechartsPrimitive.ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  No agent data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Source Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Lead Source Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RechartsPrimitive.ResponsiveContainer width="100%" height={250}>
                <RechartsPrimitive.BarChart data={analytics.sourceEfficiency}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                  <RechartsPrimitive.XAxis dataKey="source" angle={-45} textAnchor="end" height={100} />
                  <RechartsPrimitive.YAxis />
                  <RechartsPrimitive.Tooltip />
                  <RechartsPrimitive.Legend />
                  <RechartsPrimitive.Bar dataKey="leads" fill="#8884d8" name="Leads" />
                  <RechartsPrimitive.Bar dataKey="sqls" fill="#82ca9d" name="SQLs" />
                </RechartsPrimitive.BarChart>
              </RechartsPrimitive.ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Spend vs Leads</CardTitle>
          </CardHeader>

          <CardContent>
            <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
              <RechartsPrimitive.BarChart data={campaignPerformance}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis dataKey="campaign" />
                <RechartsPrimitive.YAxis />
                <RechartsPrimitive.Tooltip />
                <RechartsPrimitive.Legend />

                <RechartsPrimitive.Bar
                  dataKey="spent"
                  name="Amount Spent"
                  fill="#8884d8"
                />

                <RechartsPrimitive.Bar
                  dataKey="leads"
                  name="Leads"
                  fill="#82ca9d"
                />

              </RechartsPrimitive.BarChart>
            </RechartsPrimitive.ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reach vs Impressions by Campaign</CardTitle>
          </CardHeader>

          <CardContent>
            <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
              <RechartsPrimitive.BarChart data={reachComparison}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis dataKey="campaign" />
                <RechartsPrimitive.YAxis />
                <RechartsPrimitive.Tooltip content={<CampaignTooltip />} />
                <RechartsPrimitive.Legend />

                <RechartsPrimitive.Bar
                  dataKey="reach"
                  fill="#3b82f6"
                  name="Reach"
                />

                <RechartsPrimitive.Bar
                  dataKey="impressions"
                  fill="#f59e0b"
                  name="Impressions"
                />

              </RechartsPrimitive.BarChart>
            </RechartsPrimitive.ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Rate Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPrimitive.ResponsiveContainer width="100%" height={300}>
              <RechartsPrimitive.LineChart data={analytics.conversionTrends}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis dataKey="week" />
                <RechartsPrimitive.YAxis />
                <RechartsPrimitive.Tooltip />
                <RechartsPrimitive.Legend />
                <RechartsPrimitive.Line
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Conversion Rate %"
                />
              </RechartsPrimitive.LineChart>
            </RechartsPrimitive.ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Current Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {analytics.stageMetrics.slice(0, 8).map(stage => (
                <div key={stage.stage} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{stage.stage}</Badge>
                    <span className="text-sm text-muted-foreground">{stage.count} leads</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{stage.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MultiSelectFilter({
  title,
  options,
  selected,
  onChange
}) {
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{title}</label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            {selected.length === 0
              ? `Select ${title}`
              : `${selected.length} selected`}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-0">
          <Command>
            <CommandInput placeholder={`Search ${title}...`} />
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => toggleOption(option)}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={selected.includes(option)}
                  />
                  <span>{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((item) => (
            <Badge key={item} variant="primary" className="flex items-center gap-1">
              {item}
              <X
                className="h-3 w-3 cursor-pointer text-red-500"
                onClick={() =>
                  onChange(selected.filter((i) => i !== item))
                }
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}