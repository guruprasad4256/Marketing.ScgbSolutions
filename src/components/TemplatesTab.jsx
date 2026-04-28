import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, LayoutTemplate, User, Building, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { api } from "@/utils/Api";

const TemplatesTab = () => {
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define the strict allowed IDs
  const ALLOWED_IDS = ["177", "178", "179"];

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/mca-campaign/templates'); 
      
      // STRICTOR FILTER: Only keep 177, 178, and 179
      const filtered = response.data.filter(tpl => 
        ALLOWED_IDS.includes(tpl.id.toString())
      );

      setTemplates(filtered);
      
      if (filtered.length > 0) {
        setActiveTemplate(filtered[0]);
      }
    } catch (err) {
      setError("Failed to load templates from Brevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A4486]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Syncing Brevo Assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
        <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Template List */}
      <div className="col-span-1 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutTemplate className="h-4 w-4 text-[#1A4486]" />
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Campaign Flow</h2>
        </div>

        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card 
              key={tpl.id} 
              onClick={() => setActiveTemplate(tpl)}
              className={`cursor-pointer transition-all border shadow-sm ${
                activeTemplate?.id === tpl.id 
                ? 'border-[#1A4486] bg-blue-50/30' 
                : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 rounded-md border-none ${
                    activeTemplate?.id === tpl.id 
                    ? 'bg-[#1A4486] text-white' 
                    : 'bg-slate-100 text-slate-500'
                  }`}>
                    ID: {tpl.id}
                  </Badge>
                  <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(tpl.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <h3 className={`font-bold text-sm ${activeTemplate?.id === tpl.id ? 'text-[#1A4486]' : 'text-slate-700'}`}>
                  {tpl.name}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${tpl.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Live in Brevo</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Email Preview Pane */}
      <div className="col-span-1 md:col-span-2">
        {activeTemplate && (
          <Card className="h-full border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[650px] bg-white rounded-2xl">
            
            {/* Header Styling */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200"></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lead Inbox Preview</span>
              <div className="w-12"></div>
            </div>

            {/* Email Metadata */}
            <div className="px-8 py-6 border-b border-slate-50 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 w-14 text-right uppercase">To:</span>
                <div className="bg-blue-50 text-[#1A4486] px-3 py-1 rounded-lg font-bold text-[10px] flex items-center gap-2 border border-blue-100">
                  <User className="h-3 w-3" /> {'{{NAME}}'} 
                  <span className="text-blue-200 mx-1">|</span> 
                  <Building className="h-3 w-3" /> {'{{COMPANY}}'}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-[10px] font-bold text-slate-400 w-14 text-right uppercase mt-1">Subject:</span>
                <span className="text-sm font-bold text-slate-800">{activeTemplate.subject}</span>
              </div>
            </div>

            {/* HTML Content Render */}
            <div className="flex-1 bg-white overflow-hidden flex flex-col">
               <iframe 
                title="Email Preview"
                srcDoc={activeTemplate.htmlContent}
                className="w-full flex-1 border-none"
               />
            </div>

            <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Source: Brevo API v3</span>
              <span className="flex items-center gap-1.5 text-[#1A4486]">
                Production Ready <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TemplatesTab;