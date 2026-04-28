import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Send, X, ArrowLeft, User, Phone, Calendar, AlertCircle, Filter, Building, Briefcase } from "lucide-react";
import { api } from "@/utils/Api";
import StickySearchHeader from "@/components/StickySearchHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { createPageUrl } from '@/utils/CreatePage';
import { Link } from 'react-router-dom';
import { toast } from "sonner";

export default function BulkMessaging() {
    const [leads, setLeads] = useState([]);
    const [filters, setFilters] = useState({
        funnel: [],
        stage: [],
        month: [],
        search: "",
        salesAgent: [],
        objection: [],
        ads: [],
    });

    const [selectedLeads, setSelectedLeads] = useState([]);
    const [message, setMessage] = useState("");
    const [image, setImage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const itemsPerPage = 20; // you can change (10, 25, 50)


    const normalizeLead = (lead) => {
        const fixed = { ...lead };

        const contactLower = String(lead.Contact || lead.contact || "").toLowerCase();

        const isMonth = [
            "march", "april", "may", "june", "july", "august",
            "september", "october", "november", "december", "january", "february"
        ].includes(contactLower);

        const funnelStr = String(lead.Funnel || lead.funnel || "").trim();
        const stageStr = String(lead.Stage || lead.stage || "").trim();

        const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(funnelStr);
        const looksLikePhone = /^[0-9\s+\-]{8,}$/.test(stageStr);

        // ✅ Fix shifted Excel columns
        if (isMonth && looksLikeDate && looksLikePhone) {
            fixed.month = lead.Contact || "";
            fixed.date = lead.Funnel || "";
            fixed.contact = lead.Stage || "";
            fixed.stage = lead["Company Name"] || lead.companyName || "";
            fixed.funnel = lead.funnel || lead.Funnel || "";
            fixed.companyName = lead.Website || "";
        } else {
            fixed.month = lead.month || lead.Month || "";
            fixed.date = lead.date || lead.Date || "";
            fixed.contact =
                lead.contact || lead.Contact || lead.Phone || "";
            fixed.stage = lead.stage || lead.Stage || "";
            fixed.companyName =
                lead.companyName || lead["Company Name"] || "";
            fixed.funnel = lead.funnel || lead.Funnel || "";
        }

        // Core fields
        fixed.id =
            lead.Id ||
            lead.LeadId ||
            lead._id ||
            lead._rowNumber ||
            lead._row ||
            "";

        fixed.name = lead.name || lead.Name || "";

        // ✅ Marketing fields
        fixed.ads = lead.ads || lead.Ad || lead.ad || "";
        fixed.Objection = lead.Objection || lead.objection || "";

        // ✅ Contact info
        fixed.email = lead.email || lead.Email || "";
        fixed.website = lead.website || lead.Website || "";

        // ✅ Business info
        fixed.industry =
            lead.industry ||
            lead.Industry ||
            lead["Specified Industry"] ||
            "";

        fixed.companyName =
            fixed.companyName ||
            lead.companyName ||
            lead["Company Name"] ||
            "";

        // ✅ Sales
        fixed.followUpBy =
            lead.followUpBy || lead["Followup By"] || "";

        // ✅ Extra
        fixed.query = lead.query || lead.Query || "";

        // ✅ Dates
        fixed.createdAt = lead.createdAt || lead.CreatedAt || "";
        fixed.updatedAt = lead.updatedAt || lead.UpdatedAt || "";

        return fixed;
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const res = await api.get("/api/leads");

            const normalized = (res?.data?.data || []).map(normalizeLead);
            setLeads(normalized);

        } catch (err) {
            console.error(err);
        }
    };

    // ✅ FILTER LOGIC (same as dashboard simplified)
    const filteredLeads = useMemo(() => {
        return leads
            .filter((lead) => {

                if (filters.funnel.length && !filters.funnel.includes(lead.funnel)) return false;
                if (filters.stage.length && !filters.stage.includes(lead.stage)) return false;
                if (filters.month.length && !filters.month.includes(lead.month)) return false;
                if (filters.salesAgent.length && !filters.salesAgent.includes(lead.followUpBy)) return false;
                if (filters.objection.length && !filters.objection.includes(lead.Objection)) return false;
                if (filters.ads.length && !filters.ads.includes(lead.ads)) return false;

                if (filters.search) {
                    const q = filters.search.toLowerCase();
                    return (
                        String(lead.name).toLowerCase().includes(q) ||
                        String(lead.contact).toLowerCase().includes(q)
                    );
                }

                return true;
            })
            // ✅ SORT HERE (latest first)
            .sort((a, b) => {
                const parseDate = (d) => {
                    if (!d) return 0;

                    // handle dd/mm/yyyy
                    if (typeof d === "string" && d.includes("/")) {
                        const [day, month, year] = d.split("/");
                        return new Date(year, month - 1, day);
                    }

                    return new Date(d);
                };

                return parseDate(b.date || b.createdAt) - parseDate(a.date || a.createdAt);
            });

    }, [leads, filters]);

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLeads.slice(start, start + itemsPerPage);
    }, [filteredLeads, currentPage]);

    // ✅ SELECT HANDLER
    const toggleSelect = (lead) => {
        if (selectedLeads.find((l) => l.id === lead.id)) {
            setSelectedLeads(selectedLeads.filter((l) => l.id !== lead.id));
        } else {
            setSelectedLeads([...selectedLeads, lead]);
        }
    };

    // ✅ IMAGE UPLOAD
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImage(file);
        setImagePreview(URL.createObjectURL(file)); // 🔥 preview
    };

    const uploadToCloudinary = async () => {
        if (!image) return;

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("file", image);

            // 🔥 your backend handles cloudinary
            const res = await api.post("/api/upload", formData);

            const url = res.data.url;

            setUploadedImageUrl(url);

            toast.success("Image uploaded Successfully");

        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const exportToCSV = () => {
        const data = selectedLeads.length > 0 ? selectedLeads : filteredLeads;

        if (data.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = [
            "Name",
            "Contact",
            "Date",
            "Company",
            "Industry",
            "Stage",
            "Funnel",
            "Month",
            "Objection",
            "Sales Agent",
            "Ads"
        ];

        const rows = data.map((lead) => [
            lead.name,
            lead.contact,
            lead.date,
            lead.companyName,
            lead.industry,
            lead.stage,
            lead.funnel,
            lead.month,
            lead.Objection,
            lead.followUpBy,
            lead.ads
        ]);

        let csvContent =
            "data:text/csv;charset=utf-8," +
            [headers, ...rows]
                .map((e) => e.map(v => `"${v || ""}"`).join(","))
                .join("\n");

        const encodedUri = encodeURI(csvContent);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "leads_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const uniqueFunnels = [...new Set(leads.map(l => l.funnel).filter(Boolean))];
    const uniqueStages = [...new Set(leads.map(l => l.stage).filter(Boolean))];
    const uniqueMonths = [...new Set(leads.map(l => l.month).filter(Boolean))];
    const uniqueSalesAgents = [...new Set(leads.map(l => l.followUpBy).filter(Boolean))];
    const uniqueObjections = [...new Set(leads.map(l => l.Objection).filter(Boolean))];
    const uniqueAds = [...new Set(leads.map(l => l.ads).filter(Boolean))];

    const parseMessage = (template, lead) => {
        return template.replace(/{{(.*?)}}/g, (_, key) => {
            const value = lead[key.trim()];
            return value !== undefined && value !== null ? value : "";
        });
    };

    const handleSend = async () => {
        if (!message || selectedLeads.length === 0) {
            toast.error("Message & leads required");
            return;
        }

        try {
            const contacts = selectedLeads.map((lead) => ({
                phone: String(lead.contact), // ✅ MUST be string
                name: lead.name || "",
                companyname: lead.companyName || "",
            }));

            const payload = {
                img_url: uploadedImageUrl, // ✅ REQUIRED
                message_template: message, // ✅ REQUIRED
                country_code: "91", // or dynamic
                contacts,
            };

            await api.post("/send-bulk", payload);

            toast.success("Messages sent Successfully !!");

            setSelectedLeads([]);
            setMessage("");
            setImage(null);

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to send");
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const previewLead = selectedLeads[0] || leads[0] || {};

    return (
        <div className="min-h-screen">
            <StickySearchHeader />
            <div className="container mx-auto p-6 space-y-6">
                <div>
                    <Link to={createPageUrl("dashboard")}>
                        <Button variant="ghost" size="sm" className="mb-2">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>

                    <h1 className="text-3xl font-bold">Campaign Messaging</h1>

                    <p className="text-muted-foreground">
                        Filter leads, select audience, and send bulk messages with media
                    </p>
                </div>

                {/* FILTERS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {/* TOP ROW */}
                        <div className="grid mb-4 md:grid-cols-2 gap-4">

                            {/* Search */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Search</label>
                                <Input
                                    placeholder="Search leads..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters({ ...filters, search: e.target.value })
                                    }
                                />
                            </div>

                            {/* (Optional) You can add Date Filter here later */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Quick Info
                                </label>
                                <div className="text-sm text-muted-foreground pt-2">
                                    Total Leads: {filteredLeads.length}
                                </div>
                            </div>
                        </div>

                        {/* FILTERS GRID */}
                        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">

                            <MultiSelectFilter
                                title="Sales Agent"
                                options={uniqueSalesAgents}
                                selected={filters.salesAgent}
                                onChange={(v) =>
                                    setFilters({ ...filters, salesAgent: v })
                                }
                            />

                            <MultiSelectFilter
                                title="Funnel"
                                options={uniqueFunnels}
                                selected={filters.funnel}
                                onChange={(v) =>
                                    setFilters({ ...filters, funnel: v })
                                }
                            />

                            <MultiSelectFilter
                                title="Stage"
                                options={uniqueStages}
                                selected={filters.stage}
                                onChange={(v) =>
                                    setFilters({ ...filters, stage: v })
                                }
                            />

                            <MultiSelectFilter
                                title="Month"
                                options={uniqueMonths}
                                selected={filters.month}
                                onChange={(v) =>
                                    setFilters({ ...filters, month: v })
                                }
                            />

                            <MultiSelectFilter
                                title="Objection"
                                options={uniqueObjections}
                                selected={filters.objection}
                                onChange={(v) =>
                                    setFilters({ ...filters, objection: v })
                                }
                            />

                            <MultiSelectFilter
                                title="Ads"
                                options={uniqueAds}
                                selected={filters.ads}
                                onChange={(v) =>
                                    setFilters({ ...filters, ads: v })
                                }
                            />

                        </div>

                        {/* CLEAR FILTER BUTTON */}
                        {(filters.funnel.length ||
                            filters.stage.length ||
                            filters.month.length ||
                            filters.salesAgent.length ||
                            filters.objection.length ||
                            filters.ads.length ||
                            filters.search) > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() =>
                                        setFilters({
                                            funnel: [],
                                            stage: [],
                                            month: [],
                                            search: "",
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

                {/* MESSAGE BOX */}
                <Card>
                    <CardHeader>
                        <CardTitle>Send Message</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">

                        {/* TEXTAREA */}
                        <textarea
                            className="w-full border rounded-md p-3 min-h-[100px]"
                            placeholder="Type your message... (use {{name}}, {{companyName}} etc)"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />

                        {/* VARIABLES HINT */}
                        <p className="text-xs text-muted-foreground">
                            Variables: {"{{name}}, {{companyName}}, {{industry}}, {{stage}}, {{funnel}}"}
                        </p>

                        {/* 🔥 PREVIEW */}
                        <div className="border rounded-lg p-3 bg-muted/40">
                            <p className="text-sm font-medium mb-1">Preview</p>

                            <div className="text-sm whitespace-pre-wrap">
                                {message
                                    ? parseMessage(message, previewLead)
                                    : "Your message preview will appear here..."}
                            </div>

                            {previewLead?.name && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Previewing for: {previewLead.name}
                                </p>
                            )}
                        </div>

                        {/* IMAGE UPLOAD */}
                        <div className="space-y-4">

                            {/* ✅ SHOW UPLOAD ONLY WHEN NO IMAGE */}
                            {!imagePreview && (
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="image-upload"
                                    />

                                    <label htmlFor="image-upload">
                                        <Button variant="outline" asChild>
                                            <span>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Image
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            )}

                            {/* 🔥 IMAGE PREVIEW */}
                            {imagePreview && (
                                <div className="relative border rounded-xl p-4 bg-muted/30 w-fit">

                                    {/* ❌ DELETE ICON */}
                                    <button
                                        onClick={() => {
                                            setImage(null);
                                            setImagePreview(null);
                                            setUploadedImageUrl("");
                                        }}
                                        className="absolute top-2 right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow hover:scale-105 transition"
                                    >
                                        <X className="h-4 w-4 text-red-500" />
                                    </button>

                                    <p className="text-sm font-medium mb-2">Image Preview</p>

                                    {/* 🖼 BIGGER IMAGE */}
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        className="w-64 h-auto rounded-lg border object-cover"
                                    />

                                    {/* 🚀 ACTION */}
                                    <div className="mt-3">
                                        {!uploadedImageUrl ? (
                                            <Button
                                                size="sm"
                                                onClick={uploadToCloudinary}
                                                disabled={uploading}
                                                className="w-full"
                                            >
                                                {uploading ? "Uploading..." : "Add to Message"}
                                            </Button>
                                        ) : (
                                            <p className="text-sm text-green-600 font-medium text-center">
                                                Image added to message ✅
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEND BUTTON */}
                        <Button onClick={handleSend}>
                            <Send className="mr-2 h-4 w-4" />
                            Send to {selectedLeads.length} Leads
                        </Button>

                    </CardContent>
                </Card>

                {/* LEADS TABLE */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Select Leads ({filteredLeads.length})</CardTitle>

                            <Button variant="outline" onClick={exportToCSV}>
                                Export to Sheets
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="max-h-[500px] overflow-auto">
                        <Table>
                            {/* HEADER */}
                            <TableHeader className="sticky top-0 z-20 bg-[#FBD407] dark:bg-slate-900">
                                <TableRow className="border-b border-slate-300 dark:border-slate-700">

                                    {/* SELECT */}
                                    <TableHead className="w-[50px] first:rounded-tl-xl">
                                        <Checkbox
                                            checked={
                                                filteredLeads.length > 0 &&
                                                selectedLeads.length === filteredLeads.length
                                            }
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedLeads(filteredLeads);
                                                } else {
                                                    setSelectedLeads([]);
                                                }
                                            }}
                                        />
                                    </TableHead>

                                    {/* NAME */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            Name
                                        </div>
                                    </TableHead>

                                    {/* CONTACT */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Phone className="h-4 w-4" />
                                            Contact
                                        </div>
                                    </TableHead>

                                    {/* DATE */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Date
                                        </div>
                                    </TableHead>

                                    {/* COMPANY */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Building className="h-4 w-4" />
                                            Company
                                        </div>
                                    </TableHead>

                                    {/* INDUSTRY */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Briefcase className="h-4 w-4" />
                                            Industry
                                        </div>
                                    </TableHead>

                                    {/* STAGE */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Filter className="h-4 w-4" />
                                            Stage
                                        </div>
                                    </TableHead>

                                    {/* FUNNEL */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Filter className="h-4 w-4" />
                                            Funnel
                                        </div>
                                    </TableHead>

                                    {/* MONTH */}
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Month
                                        </div>
                                    </TableHead>

                                    {/* OBJECTION */}
                                    <TableHead className="last:rounded-tr-xl">
                                        <div className="flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            Objection
                                        </div>
                                    </TableHead>

                                </TableRow>
                            </TableHeader>

                            {/* BODY */}
                            <TableBody>
                                {paginatedLeads.length > 0 ? (
                                    paginatedLeads.map((lead) => {
                                        const isSelected = selectedLeads.some(
                                            (l) => l.id === lead.id
                                        );

                                        return (
                                            <TableRow
                                                key={lead.id}
                                                className={`cursor-pointer transition-colors
                hover:bg-muted/50
                ${isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""}
              `}
                                            >
                                                {/* SELECT */}
                                                <TableCell>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(lead)}
                                                    />
                                                </TableCell>

                                                {/* NAME */}
                                                <TableCell className="font-medium">
                                                    {lead.name || "-"}
                                                </TableCell>

                                                {/* CONTACT */}
                                                <TableCell>
                                                    {lead.contact || "-"}
                                                </TableCell>

                                                {/* DATE */}
                                                <TableCell>
                                                    {lead.date || "-"}
                                                </TableCell>

                                                {/* COMPANY */}
                                                <TableCell className="font-medium">
                                                    {lead.companyName || "-"}
                                                </TableCell>

                                                {/* INDUSTRY */}
                                                <TableCell>
                                                    {lead.industry || "-"}
                                                </TableCell>

                                                {/* STAGE */}
                                                <TableCell>
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                        {lead.stage || "-"}
                                                    </span>
                                                </TableCell>

                                                {/* FUNNEL */}
                                                <TableCell>
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                        {lead.funnel || "-"}
                                                    </span>
                                                </TableCell>

                                                {/* MONTH */}
                                                <TableCell>
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                                        {lead.month || "-"}
                                                    </span>
                                                </TableCell>

                                                {/* OBJECTION */}
                                                <TableCell>
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                        {lead.Objection || "-"}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                                            No leads found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    Previous
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Next
                                </Button>
                            </div>
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