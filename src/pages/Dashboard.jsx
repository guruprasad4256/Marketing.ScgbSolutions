import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { PieChart, Pie, LabelList } from "recharts"
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, Target, DollarSign, Filter, Search, Calendar as ShadCalender, Star, Link as LinkIcon, UserCheck, CheckSquare, LayoutGrid, BarChart3, Table as TableIcon, TrendingUp, CalendarRange, BadgeCheck } from 'lucide-react';
import * as RechartsPrimitive from 'recharts';
import KPICard from '@/components/KPICard';
import LeadDetailModal from '@/components/LeadDetailModal';
import ExcelUploadModal from '@/components/ExcelUploadModal';
import { api } from '@/utils/Api';
import { Link } from 'react-router-dom';
import { format } from "date-fns"
import { createPageUrl } from '@/utils/CreatePage';
import StickySearchHeader from '@/components/StickySearchHeader';
import AddLeadModal from '@/components/AddLeadModal';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [excelFiles, setExcelFiles] = useState([]);
  const [selectedFileUrl, setSelectedFileUrl] = useState(''); // Changed from DEFAULT_FILE_URL to empty string
  const [uploading, setUploading] = useState(false);
  const [chartType, setChartType] = useState("distribution");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    leads: []
  });
  const [filters, setFilters] = useState({
    funnel: [],
    stage: [],
    month: [],
    search: '',
    dateFrom: undefined,
    dateTo: undefined,
    salesAgent: [],
    objection: [],
    ads: [],
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [syncedLeads, setSyncedLeads] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [showCuratedOnly, setShowCuratedOnly] = useState(false);

  const ROUTES = {
    excelFilesList: '/api/excel-files',        // GET
    excelFileCreate: '/api/excel-file-create', // POST
    leadsList: '/api/leads',                 // GET
    leadsCreate: '/api/leads',          // POST
    tasksList: '/api/tasks',                   // GET (params: status=pending&limit=10)
  };

  useEffect(() => {
    setPage(1);
  }, [filters, dashboardData.leads.length]);

  const handleAddNewRow = () => setShowAddLeadModal(true);

  const normalizeLead = (lead) => {
    const fixed = { ...lead };

    // Safe lowercase for contact
    const contactLower = String(lead.Contact || lead.contact || "").toLowerCase();

    const isMonth = [
      "march", "april", "may", "june", "july", "august",
      "september", "october", "november", "december", "january", "february"
    ].includes(contactLower);

    const funnelStr = String(lead.Funnel || lead.funnel || "").trim();
    const stageStr = String(lead.Stage || lead.stage || "").trim();

    const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(funnelStr);
    const looksLikePhone = /^[0-9\s+\-]{8,}$/.test(stageStr);

    if (isMonth && looksLikeDate && looksLikePhone) {
      // Fix shifted columns
      fixed.month = lead.Contact || "";
      fixed.date = lead.Funnel || "";
      fixed.contact = lead.Stage || "";
      fixed.stage = lead["Company Name"] || lead.companyName || "";
      fixed.funnel = lead.funnel || lead.Funnel || "";
      fixed.companyName = lead.Website || "";
    } else {
      fixed.month = lead.month || lead.Month || "";
      fixed.date = lead.date || lead.Date || "";
      fixed.contact = lead.contact || lead.Contact || lead["Phone"] || "";
      fixed.stage = lead.stage || lead.Stage || "";
      fixed.companyName = lead.companyName || lead["Company Name"] || "";
      fixed.funnel = lead.funnel || lead.Funnel || "";
    }

    fixed.name = lead.name || lead.Name || "";
    fixed.Objection = lead.Objection || lead.objection || "";
    fixed.ads = lead.Ad || lead.ad || "";
    fixed.email = lead.email || lead.Email || "";
    fixed.industry = lead.industry || lead.Industry || lead["Specified Industry"] || "";
    fixed.followUpBy = lead.followUpBy || lead["Followup By"] || "";
    fixed.website = lead.Website || lead.website || "";
    fixed.query = lead.query || lead.Query || "";
    fixed.id = lead.Id || lead.LeadId || lead._id || lead._rowNumber || lead._row || '';
    fixed.isCurated = String(lead.isCurated).toLowerCase().trim() === "true";

    return fixed;
  };

  const normalizeFile = (file) => {
    const id = file?.id || file?._id;
    return { ...file, id };
  };

  const normalizeTask = (task) => {
    const id = task?.id || task?._id;
    return { ...task, id };
  };

  useEffect(() => {
    loadExcelFiles();
    loadSyncedLeads();
    loadUpcomingTasks();
    loadDashboardData();
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get("/api/leads/budget");

      if (res?.data?.ok) {
        setBudgets(res.data.data || []);
      } else {
        console.error("Failed to fetch budgets:", res?.data);
        setBudgets([]);
      }

    } catch (error) {
      console.error("Budget fetch error:", error);
      setBudgets([]);
    }
  };

  useEffect(() => {
    if (selectedFileUrl) {
      loadDashboardData();
    }
  }, [selectedFileUrl]);

  const handleAddLeadSuccess = async () => {
    setShowAddLeadModal(false);
    await loadDashboardData();
  };

  // ✅ replaced ExcelFile.list
  const loadExcelFiles = async () => {
    try {
      const res = await api.get(ROUTES.excelFilesList, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const files = (res?.data?.data || []).map(normalizeFile);

      setExcelFiles(files);

      // Auto-select first file if available
      if (files.length > 0 && !selectedFileUrl) {
        setSelectedFileUrl(files[0].fileUrl);
      }
    } catch (err) {
      console.error('Error loading excel files:', err);
      setExcelFiles([]);
    }
  };

  // ✅ replaced Lead.list
  const loadSyncedLeads = async () => {
    try {
      const res = await api.get(ROUTES.leadsList);
      const leads = (res?.data?.data || []).map(normalizeLead);
      setSyncedLeads(leads);
    } catch (err) {
      console.error('Error loading synced leads:', err);
      setSyncedLeads([]);
    }
  };

  // ✅ replaced Task.filter
  const loadUpcomingTasks = async () => {
    try {
      const res = await api.get(ROUTES.tasksList, {
        params: { status: 'Pending', limit: 10 }
      });
      const tasks = (res?.data?.data || []).map(normalizeTask);
      setUpcomingTasks(tasks);
    } catch (err) {
      console.error('Error loading upcoming tasks:', err);
      setUpcomingTasks([]);
    }
  };

  const extractArray = (res) => {
    const raw =
      res?.data?.data ??
      res?.data?.leads ??
      res?.data?.tasks ??
      res?.data ??
      [];

    return Array.isArray(raw) ? raw : [];
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(ROUTES.leadsList);
      const raw = extractArray(res);
      const dbLeads = raw.map(normalizeLead);

      // ONLY STORE LEADS
      setDashboardData({
        leads: dbLeads
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setDashboardData({ leads: [] });
    } finally {
      setLoading(false);
    }
  };

  // ✅ replaced ExcelFile.create with backend route
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload to proxy integration server (keep as-is)
      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'x-api-key': window.config.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const fileUrl = uploadResponse.data.url;

      // Save file record in YOUR backend
      await api.post(ROUTES.excelFileCreate, {
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString(),
        description: 'Marketing tracker file'
      });

      await loadExcelFiles();
      setSelectedFileUrl(fileUrl);

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload file: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleUploadSuccess = async (fileUrl) => {
    setShowUploadModal(false);
    await loadExcelFiles();
    await loadSyncedLeads();
    setSelectedFileUrl(fileUrl);
    await loadDashboardData();
  };

  // ✅ replaced Lead.create with backend POST /leads-create
  const handleLeadClick = async (lead) => {
    try {
      if (!lead.id) {
        const res = await api.post(ROUTES.leadsCreate, lead);
        const createdLead = normalizeLead(res?.data?.data || lead);
        setSelectedLead(createdLead);
      } else {
        setSelectedLead(normalizeLead(lead));
      }
      setShowLeadModal(true);
    } catch (err) {
      console.error('Error opening lead:', err);
      alert('Failed to open lead');
    }
  };

  const handleChartClick = (data) => {
    if (data && data.stage) setFilters({ ...filters, stage: [data.stage] });
  };

  const filteredLeads = useMemo(() => {
    return (dashboardData.leads || [])
      .filter((lead) => {

        if (showCuratedOnly && !lead.isCurated) return false;

        if (filters.stage.length > 0) {
          const leadStage = String(lead.stage || "").toLowerCase().trim();

          const SQL_STAGES = [
            "sql",
            "advanced sql",
            "discovery scheduled",
            "discovery done",
            "quote",
            "won",
            "sql no response",
            "quote (lost)",
            "sql not interested",
            "trial subscribed",
            "interested for trial",
            "shared the trial details no response",
            "sql - will connect later",
          ];

          const matches = filters.stage.some((selectedStage) => {
            const selected = String(selectedStage).toLowerCase().trim();

            // If SQL selected → match whole SQL group
            if (selected === "sql") {
              return SQL_STAGES.includes(leadStage);
            }

            // Otherwise normal match
            return leadStage.includes(selected);
          });

          if (!matches) return false;
        }

        if (filters.month.length > 0 && !filters.month.includes(lead.month)) {
          return false;
        }

        if (filters.salesAgent.length > 0 && !filters.salesAgent.includes(lead.followUpBy)) {
          return false;
        }

        if (filters.funnel.length > 0) {
          const leadFunnel = String(lead.funnel || "").toLowerCase().trim();

          const matchesFunnel = filters.funnel.some((selectedFunnel) =>
            leadFunnel.includes(String(selectedFunnel).toLowerCase().trim())
          );

          if (!matchesFunnel) return false;
        }

        if (filters.objection.length > 0 && !filters.objection.includes(lead.Objection)) {
          return false;
        }

        if (filters.ads.length > 0 && !filters.ads.includes(lead.ads)) {
          return false;
        }

        if (filters.dateFrom || filters.dateTo) {
          try {
            let leadDate;
            if (lead.date) {
              const [dd, mm, yyyy] = lead.date.split('/');
              if (dd && mm && yyyy) {
                leadDate = new Date(`${yyyy}-${mm}-${dd}`);
              }
            } else if (lead.createdAt) {
              leadDate = new Date(lead.createdAt);
            }

            if (leadDate && !isNaN(leadDate)) {
              if (filters.dateFrom) {
                const from = new Date(filters.dateFrom);
                from.setHours(0, 0, 0, 0);
                if (leadDate < from) return false;
              }
              if (filters.dateTo) {
                const to = new Date(filters.dateTo);
                to.setHours(23, 59, 59, 999);
                if (leadDate > to) return false;
              }
            }
          } catch (e) {
            console.error("Date filter error:", e);
          }
        }

        if (filters.search) {
          const q = filters.search.toLowerCase();

          const normalize = (value) => String(value ?? "").toLowerCase();

          return (
            normalize(lead.name).includes(q) ||
            normalize(lead.contact).includes(q) ||
            normalize(lead.companyName).includes(q) ||
            normalize(lead.email).includes(q)
          );
        }

        return true;
      })
      // 🔥 SORT: latest first
      .sort((a, b) => {
        const parseDate = (lead) => {
          if (lead.date) {
            const [dd, mm, yyyy] = lead.date.split('/');
            if (dd && mm && yyyy) return new Date(`${yyyy}-${mm}-${dd}`).getTime();
          }
          if (lead.updatedAt) return new Date(lead.updatedAt).getTime();
          if (lead.createdAt) return new Date(lead.createdAt).getTime();
          return 0;
        };

        return parseDate(b) - parseDate(a);
      });
  }, [dashboardData.leads, filters, showCuratedOnly]);

  const filteredBudgets = useMemo(() => {

    const parseDate = (str) => {
      if (!str) return null;
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    return (budgets || []).filter((b) => {

      try {

        const reportingStart = parseDate(b.reportingStart);
        if (!reportingStart) return false;

        // DATE FILTER
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          from.setHours(0, 0, 0, 0);
          if (reportingStart < from) return false;
        }

        if (filters.dateTo) {
          const to = new Date(filters.dateTo);
          to.setHours(23, 59, 59, 999);
          if (reportingStart > to) return false;
        }

        // MONTH FILTER
        if (filters.month.length > 0) {
          const budgetMonth = reportingStart.toLocaleString("default", { month: "long" });
          if (!filters.month.includes(budgetMonth)) return false;
        }

        // ADS / CAMPAIGN FILTER
        if (filters.ads.length > 0) {
          const campaign = String(b.campaignName || "").toLowerCase();

          const match = filters.ads.some(ad =>
            campaign.includes(String(ad).toLowerCase())
          );

          if (!match) return false;
        }

        return true;

      } catch (error) {
        console.error("Budget filter error:", error);
        return false;
      }

    });

  }, [budgets, filters]);

  const kpis = useMemo(() => {
    const totalLeads = filteredLeads.length;

    const SQL_STAGES = [
      "sql",
      "advanced sql",
      "discovery scheduled",
      "discovery done",
      "quote",
      "won",
      "sql no response",
      "quote (lost)",
      "sql not interested",
      "trial subscribed",
      "interested for trial",
      "shared the trial details no response",
      "sql - will connect later",
    ];

    const sqlLeads = filteredLeads.filter((lead) => {
      const stage = String(lead.stage || "").trim().toLowerCase();

      return SQL_STAGES.some(sqlStage =>
        stage === sqlStage.toLowerCase()
      );
    }).length;

    const mqlLeads = filteredLeads.filter(
      l => l.stage && l.stage.toUpperCase().includes("MQL")
    ).length;

    const conversionRate =
      totalLeads > 0
        ? ((sqlLeads / totalLeads) * 100).toFixed(1)
        : "0.0";

    // Total Amount Spent
    const totalBudget = filteredBudgets.reduce((sum, b) => {
      const spent = parseFloat(b.amountSpent);
      return sum + (isNaN(spent) ? 0 : spent);
    }, 0);

    // ROAS
    const costPerSQL =
      sqlLeads > 0
        ? (totalBudget / sqlLeads).toFixed(2)
        : "0.00";

    return {
      totalLeads,
      sqlLeads,
      mqlLeads,
      conversionRate,
      totalBudget: totalBudget.toFixed(2),
      costPerSQL
    };

  }, [filteredLeads, filteredBudgets]);

  const chartData = useMemo(() => {
    const countMap = {}

    filteredLeads.forEach((lead) => {
      const key =
        chartType === "distribution"
          ? lead.stage
          : lead.funnel   // 👈 change if your field name is different

      const name = key && key.trim() !== "" ? key : "Unknown"

      countMap[name] = (countMap[name] || 0) + 1
    })

    return Object.entries(countMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

  }, [filteredLeads, chartType])

  const handleCallClick = (lead) => {
    const phoneNumber = String(lead?.contact || "").trim();

    if (!phoneNumber) {
      alert("No contact number available");
      return;
    }

    // Trigger phone call (works on mobile)
    window.location.href = `tel:${phoneNumber}`;

    // Open popup
    setShowCallDialog(true);
  };

  const uniqueFunnels = [...new Set(dashboardData.leads.map(l => l.funnel).filter(Boolean))];
  const uniqueStages = [...new Set(dashboardData.leads.map(l => l.stage).filter(Boolean))];
  const uniqueMonths = [...new Set(dashboardData.leads.map(l => l.month).filter(Boolean))];
  const uniqueSalesAgents = [...new Set(dashboardData.leads.map(l => l.followUpBy).filter(Boolean))];
  const uniqueObjections = [...new Set(dashboardData.leads.map(l => l.Objection).filter(Boolean))];
  const uniqueAds = [...new Set(dashboardData.leads.map(l => l.ads).filter(Boolean))];

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

  // Show empty state if no data
  if (!loading && dashboardData.leads.length === 0 && excelFiles.length === 0) {
    return (
      <div className="min-h-screen">
        <StickySearchHeader />

        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:justify-between lg:items-center">
            <div>
              <h1 className="text-3xl font-bold">Marketing CRM Dashboard</h1>
              <p className="text-muted-foreground">Track and manage your marketing leads</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('LeadsTable')}>
                <Button variant="outline">
                  <TableIcon className="mr-2 h-4 w-4" />
                  Leads Table
                </Button>
              </Link>
              <Link to={createPageUrl('GoogleSheetWebhook')}>
                <Button variant="outline">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Google Sheet Sync
                </Button>
              </Link>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Excel & Import Leads
              </Button>
            </div>
          </div>

          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-bold">No Data Yet</h2>
              <p className="text-muted-foreground max-w-md">
                Get started by uploading an Excel file with your marketing data or sync with Google Sheets
              </p>
              <div className="flex gap-3 mt-4">
                <Button onClick={() => setShowUploadModal(true)} size="lg">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Excel File
                </Button>
                <Link to={createPageUrl('GoogleSheetWebhook')}>
                  <Button variant="outline" size="lg">
                    <LinkIcon className="mr-2 h-5 w-5" />
                    Connect Google Sheets
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <ExcelUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      </div>
    );
  }

  const totalRows = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const chartConfig = chartData.reduce(
    (acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: `var(--chart-${(index % 5) + 1})`,
      }
      return acc
    },
    {
      count: { label: "Leads" },
    }
  )

  const COLORS = [
    "#2563eb", // blue
    "#16a34a", // green
    "#f59e0b", // amber
    "#dc2626", // red
    "#7c3aed", // violet
    "#0d9488", // teal
    "#ea580c", // orange
    "#64748b", // slate
  ]

  const formattedData = chartData.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  const applyRange = (type) => {
    const today = new Date();
    let from = today;
    let to = today;

    switch (type) {
      case "7":
        from = subDays(today, 7);
        break;
      case "14":
        from = subDays(today, 14);
        break;
      case "21":
        from = subDays(today, 21);
        break;
      case "30":
        from = subDays(today, 30);
        break;
      case "thisMonth":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
    }

    setFilters({
      ...filters,
      dateFrom: from,
      dateTo: to,
    });
  };

  return (
    <div className="min-h-screen">
      <StickySearchHeader />

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">Marketing CRM Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track and manage your marketing leads
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
            {/* Buttons grid on small screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:flex lg:gap-3">
              <Link to={createPageUrl("analytics")} className="w-full lg:w-auto">
                <Button variant="outline" className="w-full lg:w-auto justify-center lg:justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
              </Link>

              <Link to={createPageUrl("leads-kanban")} className="w-full lg:w-auto">
                <Button variant="outline" className="w-full lg:w-auto justify-center lg:justify-start">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Leads Kanban
                </Button>
              </Link>

              <Link to={createPageUrl("leads-table")} className="w-full lg:w-auto">
                <Button variant="outline" className="w-full lg:w-auto justify-center lg:justify-start">
                  <TableIcon className="mr-2 h-4 w-4" />
                  Leads Table
                </Button>
              </Link>

              <Link to={createPageUrl("tasks")} className="w-full lg:w-auto">
                <Button variant="outline" className="w-full lg:w-auto justify-center lg:justify-start">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  My Tasks
                </Button>
              </Link>

              {/* <Link to={createPageUrl("GoogleSheetWebhook")} className="w-full lg:w-auto sm:col-span-2 lg:col-span-1">
                <Button variant="outline" className="w-full lg:w-auto justify-center lg:justify-start">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Google Sheet Sync
                </Button>
              </Link> */}
            </div>

            {/* Excel file dropdown */}
            {excelFiles.length > 0 && (
              <div className="w-full lg:w-[250px]">
                <Select value={selectedFileUrl} onValueChange={setSelectedFileUrl}>
                  <SelectTrigger className="w-full lg:w-[250px]">
                    <SelectValue placeholder="Select Excel file" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelFiles.map((file) => (
                      <SelectItem key={file.id} value={file.fileUrl}>
                        {file.fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hidden file input */}
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid mb-4 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pick a date range
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarRange className="mr-2 h-4 w-4" />
                      {filters.dateFrom && filters.dateTo ? (
                        <>
                          {format(filters.dateFrom, "PPP")} -{" "}
                          {format(filters.dateTo, "PPP")}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Pick a date range
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0 flex" align="start">
                    <div className="border-r p-3 w-32 space-y-2 bg-muted/20">
                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("7")}
                      >
                        Last 7 Days
                      </button>

                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("14")}
                      >
                        Last 14 Days
                      </button>

                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("21")}
                      >
                        Last 21 Days
                      </button>

                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("30")}
                      >
                        Last 30 Days
                      </button>

                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("thisMonth")}
                      >
                        This Month
                      </button>

                      <button
                        className="w-full text-left text-sm hover:bg-muted p-2 rounded"
                        onClick={() => applyRange("lastMonth")}
                      >
                        Last Month
                      </button>
                    </div>

                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateFrom}
                      selected={{
                        from: filters.dateFrom,
                        to: filters.dateTo,
                      }}
                      onSelect={(range) =>
                        setFilters({
                          ...filters,
                          dateFrom: range?.from,
                          dateTo: range?.to,
                        })
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <MultiSelectFilter
                title="Sales Agent"
                options={uniqueSalesAgents}
                selected={filters.salesAgent}
                onChange={(value) =>
                  setFilters({ ...filters, salesAgent: value })
                }
              />
              <MultiSelectFilter
                title="Funnel"
                options={uniqueFunnels}
                selected={filters.funnel}
                onChange={(value) =>
                  setFilters({ ...filters, funnel: value })
                }
              />
              <MultiSelectFilter
                title="Stage"
                options={uniqueStages}
                selected={filters.stage}
                onChange={(value) =>
                  setFilters({ ...filters, stage: value })
                }
              />
              <MultiSelectFilter
                title="Month"
                options={uniqueMonths}
                selected={filters.month}
                onChange={(value) =>
                  setFilters({ ...filters, month: value })
                }
              />
              <MultiSelectFilter
                title="Filter by Objection"
                options={uniqueObjections}
                selected={filters.objection}
                onChange={(value) =>
                  setFilters({ ...filters, objection: value })
                }
              />
              <MultiSelectFilter
                title="Source/Ad"
                options={uniqueAds}
                selected={filters.ads}
                onChange={(value) =>
                  setFilters({ ...filters, ads: value })
                }
              />
            </div>
            {(
              filters.funnel.length > 0 ||
              filters.stage.length > 0 ||
              filters.month.length > 0 ||
              filters.salesAgent.length > 0 ||
              filters.objection.length > 0 ||
              filters.search ||
              filters.dateFrom ||
              filters.dateTo
            ) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setFilters({
                      funnel: [],
                      stage: [],
                      month: [],
                      search: '',
                      dateFrom: '',
                      dateTo: '',
                      salesAgent: [],
                      objection: [],
                      ads: [],
                    })
                  }
                >
                  Clear Filters
                </Button>
              )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => setFilters({ ...filters, stage: [], funnel: [] })} className="cursor-pointer">
            <KPICard
              title="Total Leads"
              value={kpis.totalLeads}
              subtitle="All time leads"
              icon={Users}
            />
          </div>
          <div onClick={() => setFilters({ ...filters, stage: ['SQL'] })} className="cursor-pointer">
            <KPICard
              title="SQL Leads"
              value={kpis.sqlLeads}
              subtitle="Sales Qualified Leads"
              icon={Target}
            />
          </div>
          <KPICard
            title="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            subtitle="SQL conversion"
            icon={TrendingUp}
          />
          <KPICard
            title="Cost Per SQL"
            value={kpis.costPerSQL}
            subtitle={`Budget: ₹${kpis.totalBudget}`}
            icon={DollarSign}
          />
        </div>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShadCalender className="h-5 w-5" />
                Upcoming Tasks ({upcomingTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.leadName} - {new Date(task.scheduledDate).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={task.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* BAR CHART CARD */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Leads by Stage (Click to Filter)
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="w-full h-[300px] sm:h-[350px] md:h-[400px]">
                <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                  <RechartsPrimitive.BarChart data={chartData}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />

                    <RechartsPrimitive.XAxis
                      dataKey="name"
                      angle={-30}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />

                    <RechartsPrimitive.YAxis tick={{ fontSize: 10 }} />

                    <RechartsPrimitive.Tooltip />

                    <RechartsPrimitive.Bar
                      dataKey="count"
                      fill="#8884d8"
                      onClick={handleChartClick}
                      cursor="pointer"
                    />
                  </RechartsPrimitive.BarChart>
                </RechartsPrimitive.ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* PIE CHART CARD */}
          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base md:text-lg">
                {chartType === "distribution"
                  ? "Lead Distribution"
                  : "Lead Source"}
              </CardTitle>

              <Select
                value={chartType}
                onValueChange={(value) => setChartType(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distribution">
                    Lead Distribution
                  </SelectItem>
                  <SelectItem value="source">
                    Lead Source
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>

            <CardContent>
              <div className="w-full h-[300px] sm:h-[350px] md:h-[420px]">
                <ChartContainer
                  config={chartConfig}
                  className="w-full h-full [&_.recharts-text]:fill-muted-foreground"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="count"
                          labelKey="name"
                        />
                      }
                    />

                    <Pie
                      data={formattedData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius={0}
                      paddingAngle={2}
                      labelLine={false}
                    >
                      <LabelList
                        dataKey="name"
                        position="outside"
                        offset={10}
                        stroke="none"
                        fontSize={10}
                        fill="hsl(var(--foreground))"
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Leads Table */}
        <Card className="bg-background text-foreground">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Leads ({filteredLeads.length})
            </CardTitle>

            <div className="flex gap-2">
              <Button
                variant={showCuratedOnly ? "secondary" : "outline"}
                onClick={() => setShowCuratedOnly(!showCuratedOnly)}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {showCuratedOnly ? "Showing Curated" : "Curated Only"}
              </Button>

              <Button onClick={handleAddNewRow} variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Add New Lead
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-hide border rounded-md dark:border-border">
              <Table>
                <TableHeader className="bg-muted/50 dark:bg-muted">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Funnel</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Sales Agent</TableHead>
                    <TableHead>Objection</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer transition-colors hover:bg-muted/50 dark:hover:bg-muted"
                      onClick={() => handleLeadClick(lead)}
                    >
                      <TableCell>{lead.date || '-'}</TableCell>
                      <TableCell className="font-medium align-middle">
                        <div className="flex items-center gap-2 h-full">
                          {lead.name || '-'}

                          {String(lead.isCurated).toLowerCase().trim() === "true" && (
                            <span className="relative group flex items-center">
                              <BadgeCheck className="w-4 h-4 text-yellow-500" />

                              <span className="absolute bottom-full mb-1 hidden group-hover:block 
          bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                Curated Member
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lead.companyName || '-'}</TableCell>
                      <TableCell>{lead.contact || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          setFilters({
                            ...filters,
                            funnel: filters.funnel.includes(lead.funnel)
                              ? filters.funnel.filter(f => f !== lead.funnel)
                              : [...filters.funnel, lead.funnel],
                          });
                        }} className="bg-blue-100/60 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {lead.funnel || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          const stageValue = lead.stage || lead.Stage;
                          setFilters({
                            ...filters,
                            stage: filters.stage.includes(stageValue)
                              ? filters.stage.filter(s => s !== stageValue)
                              : [...filters.stage, stageValue],
                          });
                        }} className="bg-green-100/60 text-green-800 dark:bg-green-950 dark:text-green-300">
                          {lead.stage || lead.Stage || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.industry || lead.Industry || '-'}</TableCell>
                      <TableCell>
                        {lead.followUpBy || lead["Followup By"] ? (
                          <Badge
                            variant="outline"
                            className="
    bg-purple-100/60 text-purple-800
    dark:bg-purple-950 dark:text-purple-300
    flex items-center
  "
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            {lead.followUpBy || lead["Followup By"]}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          const objectionValue = lead.objection || lead.Objection;
                          setFilters({
                            ...filters,
                            objection: filters.objection.includes(objectionValue)
                              ? filters.objection.filter(o => o !== objectionValue)
                              : [...filters.objection, objectionValue],
                          });
                        }}>{lead.Objection || lead.objection || '-'}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          const monthValue = lead.month || lead.Month;
                          setFilters({
                            ...filters,
                            month: filters.month.includes(monthValue)
                              ? filters.month.filter(m => m !== monthValue)
                              : [...filters.month, monthValue],
                          });
                        }}>{lead.month || lead.Month || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleCallClick(lead)}>
                          <Phone className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Call Initiated</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2">
                    <p className="text-sm">
                      Calling:
                    </p>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button onClick={() => setShowCallDialog(false)}>
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{totalRows === 0 ? 0 : startIndex + 1}</span>–
                <span className="font-medium">{Math.min(endIndex, totalRows)}</span> of{" "}
                <span className="font-medium">{totalRows}</span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Page size */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prev / Next */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Prev
                  </Button>

                  <span className="text-sm">
                    Page <span className="font-medium">{safePage}</span> /{" "}
                    <span className="font-medium">{totalPages}</span>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excel Upload Modal */}
        <ExcelUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />

        {/* Lead Detail Modal */}
        <LeadDetailModal
          lead={selectedLead}
          open={showLeadModal}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
            loadUpcomingTasks(); // Refresh tasks
          }}
          onUpdate={loadDashboardData}
        />

        <AddLeadModal open={showAddLeadModal} onClose={() => setShowAddLeadModal(false)} onSuccess={handleAddLeadSuccess} />
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