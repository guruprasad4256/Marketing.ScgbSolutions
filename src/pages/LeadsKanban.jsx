import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '@/components/ui/input';
import { X } from "lucide-react";
import { ArrowLeft, Filter, Phone, Mail, Building, User,Search,CalendarRange } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/CreatePage";
import LeadDetailModal from "@/components/LeadDetailModal";
import StickySearchHeader from "@/components/StickySearchHeader";
import { api } from "@/utils/Api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ============================
// ✅ BACKEND ROUTES (EDIT ONLY HERE)
// ============================
const ROUTES = {
  leadsList: "/api/leads", // GET
  leadsCreate: "/api/leads-create", // POST
  leadsUpdate: (id) => `/api/leads-update/${id}`, // PUT
};

const STAGES = [
  {
    id: "MQL",
    name: "MQL",
    color:
      "bg-blue-50 border-blue-200 text-blue-700 " +
      "dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
  },
  {
    id: "SQL",
    name: "SQL",
    color:
      "bg-yellow-50 border-yellow-200 text-yellow-700 " +
      "dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300",
  },
  {
    id: "Advanced SQL",
    name: "Advanced SQL",
    color:
      "bg-orange-50 border-orange-200 text-orange-700 " +
      "dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300",
  },
  {
    id: "Discovery Stage",
    name: "Discovery Stage",
    color:
      "bg-purple-50 border-purple-200 text-purple-700 " +
      "dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300",
  },
  {
    id: "Quote Stage",
    name: "Quote Stage",
    color:
      "bg-indigo-50 border-indigo-200 text-indigo-700 " +
      "dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300",
  },
  {
    id: "Won",
    name: "Won",
    color:
      "bg-green-50 border-green-200 text-green-700 " +
      "dark:bg-green-950 dark:border-green-800 dark:text-green-300",
  },
  {
    id: "Lost",
    name: "Lost",
    color:
      "bg-red-50 border-red-200 text-red-700 " +
      "dark:bg-red-950 dark:border-red-800 dark:text-red-300",
  },
];

// ---------- helpers ----------
const toStr = (v) => String(v ?? "").trim();
const lower = (v) => toStr(v).toLowerCase();

const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && toStr(v) !== "") return v;
  }
  return "";
};

// Normalize backend lead shape (Sheet headers -> UI keys)
const normalizeLead = (lead) => {
  const id = lead?.Id || lead?.LeadId || lead?._id || String(lead?._rowNumber || lead?._row || "");

  // note: your backend already repairs shifted rows in service; still keep strong mapping here
  const stage = pick(lead, ["stage", "Stage"]);
  const followUpBy = pick(lead, ["followUpBy", "Followup By", "Follow Up By"]);
  const funnel = pick(lead, ["funnel", "Funnel"]);

  return {
    ...lead,
    id,
    date: pick(lead, ["date", "Date"]),
    name: pick(lead, ["name", "Name"]),
    contact: pick(lead, ["contact", "Contact", "Phone Number", "Phone", "Mobile"]),
    companyName: pick(lead, ["companyName", "Company Name", "CompanyName"]),
    website: pick(lead, ["website", "Website"]),
    industry: pick(lead, ["industry", "Specified Industry", "Industry"]),
    email: pick(lead, ["email", "Email"]),
    query: pick(lead, ["query", "Query"]),
    comments: pick(lead, ["comments", "Comments"]),
    followUpBy,
    funnel,
    stage,
  };
};

// Response array extractor (supports {data:[]}, {ok:true,data:[]}, [])
const extractArray = (res) => {
  const raw = res?.data?.data ?? res?.data?.leads ?? res?.data ?? [];
  return Array.isArray(raw) ? raw : [];
};


const normalizeStageForColumn = (rawStage) => {
  const s = lower(rawStage);
  if (!s) return "";

  if (s.includes("advanced sql")) return "Advanced SQL";
  if (s.includes("discovery")) return "Discovery Stage";
  if (s.includes("quote")) return "Quote Stage";
  if (s.includes("won")) return "Won";
  if (s.includes("lost")) return "Lost";
  if (s.includes("sql")) return "SQL";
  if (s.includes("mql")) return "MQL";

  // fallback: try title-case-like matching for exact ids
  const exact = STAGES.find((st) => lower(st.id) === s);
  return exact ? exact.id : rawStage;
};

export default function LeadsKanban() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
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

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get(ROUTES.leadsList, { withCredentials: true });
      const dbLeads = extractArray(res).map(normalizeLead);

      // normalize stage column for kanban
      const normalized = dbLeads.map((l) => ({
        ...l,
        stage: normalizeStageForColumn(l.stage),
      }));

      setLeads(normalized);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const uniqueFunnels = [...new Set(leads.map(l => l.funnel).filter(Boolean))];
  const uniqueStages = [...new Set(leads.map(l => l.stage).filter(Boolean))];
  const uniqueMonths = [...new Set(leads.map(l => l.month).filter(Boolean))];
  const uniqueSalesAgents = [...new Set(leads.map(l => l.followUpBy).filter(Boolean))];
  const uniqueObjections = [...new Set(leads.map(l => l.Objection).filter(Boolean))];
  const uniqueAds = [...new Set(leads.map(l => l.ads).filter(Boolean))];

  const filteredLeads = useMemo(() => {
    return (leads || [])
      .filter((lead) => {

        if (filters.funnel.length > 0 && !filters.funnel.includes(lead.funnel)) {
          return false;
        }

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
  }, [leads, filters]);

  const getLeadsByStage = (stageId) => {
    return filteredLeads.filter((lead) => normalizeStageForColumn(lead.stage) === stageId);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const lead = leads.find((l) => String(l.id) === String(draggableId));
    if (!lead) return;

    const newStage = destination.droppableId;

    // optimistic UI update first
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(draggableId) ? { ...l, stage: newStage } : l))
    );

    const toastId = toast.loading("Updating stage...");
    try {
      if (lead.id) {
        await api.put(ROUTES.leadsUpdate(lead.id), { Stage: newStage, stage: newStage }, { withCredentials: true });
      } else {
        const created = await api.post(
          ROUTES.leadsCreate,
          { ...lead, Stage: newStage, stage: newStage },
          { withCredentials: true }
        );
        const createdLead = normalizeLead((created?.data?.data ?? created?.data) || {});
        setLeads((prev) =>
          prev.map((l) => (String(l.id) === String(draggableId) ? { ...createdLead, stage: newStage } : l))
        );
      }

      toast.success("Stage updated", { id: toastId });
    } catch (e) {
      console.error("Stage update error:", e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Failed to update lead stage";
      toast.error(msg, { id: toastId });

      // revert on error
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(draggableId) ? { ...l, stage: source.droppableId } : l
        )
      );
    }
  };

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
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
    <div className="min-h-screen">
      <StickySearchHeader />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Leads Kanban Board</h1>
              <p className="text-muted-foreground">Drag and drop leads between stages</p>
            </div>
          </div>

          <Button variant="outline" onClick={loadLeads}>
            Refresh
          </Button>
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

                  <PopoverContent className="w-auto p-0" align="start">
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

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);

              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 rounded-md border ${stage.color}`}
                    >
                      <div className={`p-4 border-b ${stage?.color || "bg-muted/50 dark:bg-muted"}`}>
                        <h3 className="font-semibold text-lg capitalize">{stage.name}</h3>
                        <p className="text-sm text-muted-foreground">{stageLeads.length} leads</p>
                      </div>

                      {/* hide scrollbars but keep scrolling (needs .scrollbar-hide css) */}
                      <div className="p-2 space-y-2 min-h-[500px] max-h-[600px] overflow-y-auto scrollbar-hide">
                        {stageLeads.map((lead, index) => {
                          const dragId = String(lead.id || `${lead.contact}-${index}`);

                          return (
                            <Draggable key={dragId} draggableId={dragId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => handleLeadClick(lead)}
                                  className={`
  bg-background
  text-foreground
  p-3 rounded-lg border
  cursor-pointer
  transition
  hover:bg-muted/50
  dark:hover:bg-muted
  ${snapshot.isDragging ? "ring-2 ring-primary shadow-lg" : ""}
`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-bold text-base text-primary">
                                        {lead.name || "Unknown"}
                                      </h4>
                                    </div>

                                    {lead.companyName && (
                                      <div className="flex items-center gap-1">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold text-sm text-foreground truncate">
                                          {lead.companyName}
                                        </span>
                                      </div>
                                    )}

                                    {lead.contact && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <span>{lead.contact}</span>
                                      </div>
                                    )}

                                    {lead.email && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}

                                    {lead.followUpBy && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <Badge variant="outline" className="text-xs bg-purple-100/60 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                          {lead.followUpBy}
                                        </Badge>
                                      </div>
                                    )}

                                    {lead.date && <div className="text-xs text-muted-foreground">{lead.date}</div>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}

                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>

        {/* Lead Detail Modal */}
        <LeadDetailModal
          lead={selectedLead}
          open={showLeadModal}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          onUpdate={loadLeads}
        />
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