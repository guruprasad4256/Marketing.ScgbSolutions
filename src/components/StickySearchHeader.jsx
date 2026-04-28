import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, X, Phone, PhoneOff, Mail, Building, User, Sun, Moon, LogOut, Grid3X3, Target, MessageSquare
} from 'lucide-react';
import { api } from '@/utils/Api';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils/CreatePage';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/scgb.webp"; 
import { toast } from "sonner";
import useUser from '@/hooks/useUser';

export default function StickySearchHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [isCallDirectly, setIsCallDirectly] = useState(true); // ✅ Global CTA state
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.userId || user?._id || null;
  const isPartner = user?.role?.isPartner;

  const apps = [
    {
      name: "Bulk Messaging",
      icon: MessageSquare,
      route: "/bulk-messaging",
    },
    {
      name: "MCA Campaigns",
      icon: Target,
      route: "/mca-campaigns",
    },
  ];

  // ✅ apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ✅ Fetch CTA Status from MongoDB on mount
  useEffect(() => {
    const fetchCtaStatus = async () => {
      try {
        // Corrected: Added /api prefix to match backend registration app.use("/api", ctaRoutes)
        const res = await api.get('/api/cta-status');
        if (res.data && typeof res.data.isCallDirectly === 'boolean') {
          setIsCallDirectly(res.data.isCallDirectly);
        }
      } catch (err) {
        console.error("Error fetching CTA status:", err);
      }
    };
    if (!isPartner) fetchCtaStatus();
  }, [isPartner]);

  // ✅ Handle CTA Toggle Update
  const handleCtaToggle = async () => {
    const newStatus = !isCallDirectly;
    setIsCallDirectly(newStatus); // Optimistic UI update

    try {
      // Corrected: Added /api prefix to match backend registration
      // This sends { status: boolean } which the backend maps to isCallDirectly
      await api.patch('/api/cta-toggle', { status: newStatus });
      toast.success(newStatus ? "Website: Direct Call ON" : "Website: Callback Mode ON", {
        position: "bottom-right",
      });
    } catch (error) {
      setIsCallDirectly(!newStatus); // Revert on failure
      toast.error("Failed to update Website CTA mode", {
        position: "bottom-right",
      });
      console.error("CTA Toggle Error:", error);
    }
  };

  // ✅ Search Debounce Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchLeads(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeLead = (lead) => ({
    id: lead.Id || lead._id || String(lead._rowNumber || ""),
    name: lead.name || lead.Name || "",
    contact: lead.contact || lead.Contact || "",
    companyName: lead.companyName || lead["Company Name"] || "",
    stage: lead.stage || lead.Stage || "",
    email: lead.email || lead.Email || "",
    industry: lead.industry || lead["Specified Industry"] || "",
    followUpBy: lead.followUpBy || lead["Followup By"] || "",
    query: lead.query || lead.Query || "",
  });

  const searchLeads = async (query) => {
    setLoading(true);
    try {
      const res = await api.get('/api/leads');
      const allLeadsRaw = Array.isArray(res?.data?.data) ? res.data.data : [];
      const allLeads = allLeadsRaw.map(normalizeLead);

      const queryLower = query.toLowerCase();

      const filtered = allLeads.filter((lead) =>
        lead.name.toLowerCase().includes(queryLower) ||
        lead.contact.toLowerCase().includes(queryLower) ||
        lead.companyName.toLowerCase().includes(queryLower) ||
        lead.email.toLowerCase().includes(queryLower) ||
        lead.industry.toLowerCase().includes(queryLower) ||
        lead.query.toLowerCase().includes(queryLower)
      );

      setSearchResults(filtered.slice(0, 15));
      setShowResults(true);
    } catch (error) {
      console.error('Error searching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadClick = (lead) => {
    if (lead.id) {
      navigate(`/leads-details/${lead.id}`); 
    }
    setSearchQuery('');
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const getStageColor = (stage) => {
    const colors = {
      'MQL': 'bg-blue-100 text-blue-800',
      'SQL': 'bg-yellow-100 text-yellow-800',
      'Advanced SQL': 'bg-orange-100 text-orange-800',
      'Discovery Stage': 'bg-purple-100 text-purple-800',
      'Quote Stage': 'bg-indigo-100 text-indigo-800',
      'Won': 'bg-green-100 text-green-800',
      'Lost': 'bg-red-100 text-red-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...", { position: "bottom-right" });
    try {
      await api.post("/api/users/logout", { userId }, { withCredentials: true });
      toast.success("You have been logged out successfully", { id: toastId, position: "bottom-right" });
      navigate("/");
    } catch (e) {
      console.error("Logout error:", e);
      toast.error("Logout failed. Please try again.", { id: toastId, position: "bottom-right" });
    }
  };

  const userName = user?.name || user?.fullName || user?.username || "User";

  const getInitials = (name = "") => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getInitials(userName);

  return (
    <div className="sticky top-0 z-50 border-b shadow-sm bg-background text-foreground">
      <div className="container mx-auto px-4 py-3 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* ✅ LEFT: Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate(isPartner ? "/partner-dashboard" : "/dashboard")}
            title="Go to Dashboard"
          >
            <img src={logo} alt="SCGB" className="h-10 w-20 md:w-auto" />
          </div>

          {/* ✅ CENTER: Search */}
          {!isPartner && (
            <div className="relative flex-1 max-w-3xl mx-auto search-container">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search leads globally..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base shadow-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-xl max-h-[500px] overflow-y-auto z-[60]">
                  {loading ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <div className="animate-pulse">Searching leads...</div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <div className="p-3 bg-muted/40 border-b sticky top-0">
                        <p className="text-sm font-semibold">Found {searchResults.length} leads</p>
                      </div>
                      <div className="divide-y">
                        {searchResults.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => handleLeadClick(lead)}
                            className="p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-base truncate">{lead.name || 'Unknown'}</h4>
                                  {lead.stage && <Badge className={`text-xs ${getStageColor(lead.stage)}`}>{lead.stage}</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  {lead.companyName && <div className="flex items-center gap-1"><Building className="h-3 w-3" /><span>{lead.companyName}</span></div>}
                                  {lead.contact && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /><span>{lead.contact}</span></div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">No leads found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ✅ RIGHT: Actions */}
          <div className="flex items-center gap-2">
            {!isPartner && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition">
                    <Grid3X3 className="h-5 w-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <div className="grid grid-cols-2 gap-4 p-3">
                    {apps.map((app) => (
                      <div key={app.name} onClick={() => navigate(app.route)} className="flex flex-col items-center p-4 rounded-2xl cursor-pointer hover:bg-primary/10 transition-all">
                        <app.icon className="h-6 w-6 mb-2 text-muted-foreground" />
                        <span className="text-xs font-medium">{app.name}</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* ✅ CTA TOGGLE SWITCH */}
            {!isPartner && (
              <div 
                onClick={handleCtaToggle}
                className={`relative w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  isCallDirectly ? "bg-green-500" : "bg-orange-500"
                }`}
                title={isCallDirectly ? "Switch to Callback Mode" : "Switch to Direct Call Mode"}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${isCallDirectly ? "translate-x-6" : "translate-x-0"}`}>
                  {isCallDirectly ? <Phone className="h-3 w-3 text-green-600" /> : <PhoneOff className="h-3 w-3 text-orange-600" />}
                </div>
              </div>
            )}

            <button onClick={toggleTheme} className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0 rounded-full md:px-3 md:py-1.5 md:rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition">
                  <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">{userInitials}</div>
                  <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">{userName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled><User className="mr-2 h-4 w-4" />{userName}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}