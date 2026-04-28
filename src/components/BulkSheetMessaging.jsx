import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Send, X, ArrowLeft, FileText, Users, User, Phone, Link as LinkIcon } from "lucide-react";
import { api } from "@/utils/Api";
import StickySearchHeader from "@/components/StickySearchHeader";
import { createPageUrl } from '@/utils/CreatePage';
import { Link } from 'react-router-dom';
import { toast } from "sonner";
import Papa from "papaparse";

export default function BulkCampaign() {
    // --- Mode & Data States ---
    const [sendMode, setSendMode] = useState("bulk"); 
    const [sheetData, setSheetData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [phoneColumn, setPhoneColumn] = useState("");
    const itemsPerPage = 20;

    // --- Recipient States ---
    const [singleName, setSingleName] = useState("");
    const [singlePhone, setSinglePhone] = useState("");

    // --- Message & Media States ---
    const [message, setMessage] = useState("");
    const [imageUrlInput, setImageUrlInput] = useState(""); 
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    // --- CSV Handling ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    const extractedHeaders = Object.keys(results.data[0]);
                    setHeaders(extractedHeaders);
                    const dataWithIds = results.data.map((row, index) => ({
                        ...row,
                        id: `row_${index}`
                    }));
                    setSheetData(dataWithIds);
                    setPhoneColumn(extractedHeaders.find(h => /phone|contact|mobile|whatsapp|num/i.test(h)) || "");
                    toast.success(`Loaded ${results.data.length} rows successfully!`);
                    setCurrentPage(1);
                }
            }
        });
    };

    // --- Pagination ---
    const totalPages = Math.ceil(sheetData.length / itemsPerPage);
    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sheetData.slice(start, start + itemsPerPage);
    }, [sheetData, currentPage]);

    const toggleSelect = (row) => {
        if (selectedLeads.find((l) => l.id === row.id)) {
            setSelectedLeads(selectedLeads.filter((l) => l.id !== row.id));
        } else {
            setSelectedLeads([...selectedLeads, row]);
        }
    };

    const toggleSelectAll = (checked) => {
        if (checked) setSelectedLeads(sheetData);
        else setSelectedLeads([]);
    };

    const parseMessage = (template, row) => {
        if (!row) return template;
        return template.replace(/{{(.*?)}}/g, (_, key) => {
            const value = row[key.trim()];
            return value !== undefined && value !== null ? value : `{{${key}}}`;
        });
    };

    // --- Image Handling ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        setImageUrlInput(""); 
    };

    const uploadToCloudinary = async () => {
        if (!image) return;
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", image);
            const res = await api.post("/api/upload", formData);
            setUploadedImageUrl(res.data.url);
            toast.success("Image processed successfully!");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    // --- Main Send Logic ---
    const handleSend = async () => {
        if (!message) {
            toast.error("Message content is required.");
            return;
        }

        const finalImage = uploadedImageUrl || imageUrlInput || "";

        try {
            let res;
            if (sendMode === "single") {
                if (!singlePhone) {
                    toast.error("Phone number is required.");
                    return;
                }
                const payload = {
                    phone: String(singlePhone).replace(/\D/g, ''),
                    name: singleName,
                    message_template: message,
                    img_url: finalImage, // Image works for single send now
                    country_code: "91"
                };
                res = await api.post("/send-message", payload);
            } else {
                if (selectedLeads.length === 0) {
                    toast.error("Please select leads from the table.");
                    return;
                }
                if (!phoneColumn) {
                    toast.error("Select the Phone Number column mapping.");
                    return;
                }
                
                const contacts = selectedLeads.map((row) => ({
                    phone: String(row[phoneColumn] || "").replace(/\D/g, ''),
                    ...row 
                })).filter(c => c.phone);

                const payload = {
                    message_template: message,
                    img_url: finalImage,
                    country_code: "91",
                    contacts,
                };
                res = await api.post("/send-bulk", payload);
            }

            if (res.data && res.data.failedCount > 0) {
                toast.error(`Error: ${res.data.failed[0].error}`);
                return; 
            }

            toast.success(`Campaign sent successfully!`);
            setMessage("");
            setImage(null);
            setImagePreview(null);
            setUploadedImageUrl("");
            setImageUrlInput("");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to send.");
        }
    };

    const previewRow = sendMode === "single" ? { name: singleName || "John Doe" } : (selectedLeads[0] || sheetData[0] || {});

    return (
        <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950">
            <StickySearchHeader />
            <div className="container mx-auto p-6 space-y-6">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link to={createPageUrl("dashboard")}>
                            <Button variant="ghost" size="sm" className="mb-2 -ml-3">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Campaign Messaging</h1>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg border">
                        <Button variant={sendMode === "bulk" ? "default" : "ghost"} onClick={() => setSendMode("bulk")}>
                            <Users className="w-4 h-4 mr-2" /> Bulk Sheet
                        </Button>
                        <Button variant={sendMode === "single" ? "default" : "ghost"} onClick={() => setSendMode("single")}>
                            <User className="w-4 h-4 mr-2" /> Single
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        {sendMode === "bulk" ? (
                            <Card className="border-blue-100">
                                <CardHeader className="bg-blue-50/50 border-b">
                                    <CardTitle className="text-lg text-blue-700">1. Data Source (CSV)</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <Input type="file" accept=".csv" onChange={handleFileUpload} />
                                    {headers.length > 0 && (
                                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                            <label className="text-sm font-semibold mb-2 block">Phone Column Mapping</label>
                                            <select className="w-full h-10 rounded-md border border-amber-300 bg-white px-3 text-sm" value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)}>
                                                <option value="">-- Select Column --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-purple-100">
                                <CardHeader className="bg-purple-50/50 border-b">
                                    <CardTitle className="text-lg text-purple-700">1. Recipient Details</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <Input placeholder="Recipient Name" value={singleName} onChange={(e) => setSingleName(e.target.value)} />
                                    <Input placeholder="Phone Number" value={singlePhone} onChange={(e) => setSinglePhone(e.target.value)} />
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT COLUMN: COMPOSE & MEDIA (Shared by both modes) */}
                    <Card className="shadow-sm flex flex-col">
                        <CardHeader className="border-b bg-white dark:bg-slate-900">
                            <CardTitle className="text-lg">2. Compose & Send</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6 flex-1 flex flex-col">
                            {/* Text Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Message Body</label>
                                <textarea className="w-full border rounded-lg p-4 min-h-[160px] resize-y bg-slate-50 focus:bg-white outline-none" placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} />
                                <p className="text-xs text-muted-foreground">
                                    Variables: {sendMode === "bulk" ? (headers.map(h => `{{${h}}}`).join(", ") || "Upload sheet first") : "{{name}}"}
                                </p>
                            </div>

                            {/* Media Attachment Section (Unified) */}
                            <div className="pt-4 border-t border-dashed space-y-4">
                                <label className="text-sm font-bold text-slate-800">Media Attachment (Optional)</label>
                                {!imagePreview ? (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input className="pl-9" placeholder="Paste Image Link (https://...)" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                                        </div>
                                        <div className="text-center text-[10px] text-muted-foreground font-bold">OR</div>
                                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer file:font-semibold" />
                                    </div>
                                ) : (
                                    <div className="relative border rounded-lg p-3 bg-slate-50 flex items-center gap-4">
                                        <img src={imagePreview} className="w-16 h-16 rounded object-cover border" alt="preview" />
                                        <div className="flex-1">
                                            {uploadedImageUrl ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">✓ File Ready</span>
                                            ) : (
                                                <Button size="sm" onClick={uploadToCloudinary} disabled={uploading}>
                                                    {uploading ? "Uploading..." : "Confirm File Upload"}
                                                </Button>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => {setImage(null); setImagePreview(null); setUploadedImageUrl("");}}><X className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                )}
                            </div>

                            {/* Live Preview */}
                            {message && (
                                <div className="border rounded-lg p-3 bg-blue-50/50 text-sm">
                                    <p className="font-semibold text-[10px] text-blue-700 uppercase mb-1">Live Preview</p>
                                    <div className="whitespace-pre-wrap">{parseMessage(message, previewRow)}</div>
                                </div>
                            )}

                            <Button size="lg" onClick={handleSend} className="w-full font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-auto">
                                <Send className="mr-2 h-5 w-5" /> {sendMode === "bulk" ? `Send Bulk (${selectedLeads.length})` : "Send Now"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* TABLE SECTION (Only for Bulk) */}
                {sendMode === "bulk" && sheetData.length > 0 && (
                    <Card className="shadow-md border-0 ring-1 ring-slate-200">
                        <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                            <CardTitle>Audience Selection ({sheetData.length} Rows)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader className="sticky top-0 z-20 bg-[#FBD407]">
                                    <TableRow>
                                        <TableHead className="w-[50px] px-4">
                                            <Checkbox checked={sheetData.length > 0 && selectedLeads.length === sheetData.length} onCheckedChange={toggleSelectAll} />
                                        </TableHead>
                                        {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLeads.map((row) => (
                                        <TableRow key={row.id} className={selectedLeads.some(l => l.id === row.id) ? "bg-blue-50" : ""}>
                                            <TableCell className="px-4">
                                                <Checkbox checked={selectedLeads.some(l => l.id === row.id)} onCheckedChange={() => toggleSelect(row)} />
                                            </TableCell>
                                            {headers.map(h => <TableCell key={h}>{row[h] || "-"}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}