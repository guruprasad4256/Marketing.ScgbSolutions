import React, { useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/Api';

export default function ExcelUploadModal({ open, onClose, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState(null);

  // ---------------------------
  // ✅ BACKEND ROUTES (EDIT THESE)
  // ---------------------------
  // These should point to YOUR backend (not entities)
  const ROUTES = {
    // save excel file record in your DB
    saveExcelFile: '/excel-file-create', // POST

    // get existing leads by contact numbers (batch)
    // recommended to create this endpoint in backend:
    // POST { contacts: ["9999", "8888"] } -> returns leads
    getLeadsByContacts: '/leads-by-contacts', // POST

    // bulk create leads
    bulkCreateLeads: '/leads-bulk-create', // POST { leads: [...] }

    // update lead by id
    updateLead: (id) => `/leads-update/${id}`, // PUT
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProcessing(false);
    setProgress(0);
    setError('');
    setSuccess(false);
    setStats(null);
    setStatus('Uploading file...');

    try {
      // Step 1: Upload file (your proxy integration service)
      const formData = new FormData();
      formData.append('file', file);

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
      setProgress(30);

      // Step 2: Save file record to YOUR backend DB (removed ExcelFile entity) :contentReference[oaicite:2]{index=2}
      setStatus('Saving file record...');
      await api.post(ROUTES.saveExcelFile, {
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString(),
        description: 'Marketing tracker file'
      });
      setProgress(40);

      // Step 3: Extract data from Excel (your proxy integration service) :contentReference[oaicite:3]{index=3}
      setStatus('Extracting data from Excel...');
      setProcessing(true);

      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-excel`,
        { fileUrl: fileUrl },
        { headers: { 'x-api-key': window.config.apiKey } }
      );

      const { allSheetsData } = extractResponse.data;
      setProgress(60);

      // Step 4: Process and import leads from ALL sheets
      setStatus('Importing leads into database...');
      const allLeads = [];
      const sheets = Object.keys(allSheetsData || {});

      for (const sheetName of sheets) {
        const sheetData = allSheetsData[sheetName];
        const processedLeads = processLeadsData(sheetData, sheetName);
        allLeads.push(...processedLeads);
      }

      setProgress(70);

      // Step 5: Bulk create/update leads in YOUR backend (removed Lead entity) :contentReference[oaicite:4]{index=4}
      if (allLeads.length > 0) {
        setStatus(`Processing ${allLeads.length} leads...`);

        const batchSize = 50;
        let imported = 0;
        let updated = 0;
        let skipped = 0;

        for (let i = 0; i < allLeads.length; i += batchSize) {
          const batch = allLeads.slice(i, i + batchSize);

          try {
            const contacts = batch.map(l => l.contact).filter(Boolean);

            // ✅ Ask backend for existing leads by contact (batch)
            // You should implement /leads-by-contacts in backend.
            const existingLeadsRes = contacts.length
              ? await api.post(ROUTES.getLeadsByContacts, { contacts })
              : { data: { data: [] } };

            const existingLeads = existingLeadsRes?.data?.data || [];
            const existingContactMap = new Map(existingLeads.map(l => [l.contact, l]));

            const leadsToCreate = [];
            const leadsToUpdate = [];

            for (const lead of batch) {
              if (!lead.contact && !lead.name) {
                skipped++;
                continue;
              }

              const existingLead = lead.contact ? existingContactMap.get(lead.contact) : null;
              if (existingLead) {
                leadsToUpdate.push({
                  id: existingLead.id || existingLead.LeadId || existingLead._id,
                  data: {
                    ...lead,
                    createdAt: existingLead.createdAt // preserve if your backend uses this
                  }
                });
              } else {
                leadsToCreate.push(lead);
              }
            }

            // ✅ Bulk create new leads via backend
            if (leadsToCreate.length > 0) {
              await api.post(ROUTES.bulkCreateLeads, { leads: leadsToCreate });
              imported += leadsToCreate.length;
            }

            // ✅ Update existing leads via backend route
            for (const { id, data } of leadsToUpdate) {
              if (!id) continue;
              await api.put(ROUTES.updateLead(id), data);
              updated++;
            }

            const currentProgress = 70 + ((i + batch.length) / allLeads.length) * 30;
            setProgress(Math.min(currentProgress, 100));
          } catch (batchError) {
            console.error('Error importing batch:', batchError);
          }
        }

        setStats({
          total: allLeads.length,
          imported,
          updated,
          skipped
        });
      }

      setProgress(100);
      setStatus('Import completed!');
      setSuccess(true);
      setUploading(false);
      setProcessing(false);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(fileUrl);
        }, 1500);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error?.response?.data?.message || error.message || 'Failed to upload and process file');
      setUploading(false);
      setProcessing(false);
    }
  };

  const processLeadsData = (rawData, sheetName) => {
    if (!rawData || rawData.length < 2) return [];

    const leads = [];
    const headerRow = rawData[0];

    const getColumnIndex = (possibleNames) => {
      for (const name of possibleNames) {
        const index = headerRow.findIndex(h =>
          h && h.toString().toLowerCase().trim() === name.toLowerCase()
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const columnMap = {
      date: getColumnIndex(['date']),
      contact: getColumnIndex(['phone number', 'contact', 'phone']),
      funnel: getColumnIndex(['funnel']),
      stage: getColumnIndex(['stage']),
      rebuttal: getColumnIndex(['rebuttal']),
      name: getColumnIndex(['name']),
      companyName: getColumnIndex(['company name', 'company']),
      website: getColumnIndex(['website']),
      industry: getColumnIndex(['specified industry', 'industry']),
      email: getColumnIndex(['mail', 'email']),
      query: getColumnIndex(['query']),
      comments: getColumnIndex(['comments']),
      followUpDate: getColumnIndex(['follow up on', 'followup date']),
      followUpTask: getColumnIndex(['followup task', 'follow up task']),
      followUpBy: getColumnIndex(['followup by', 'follow up by']),
      lastUpdatedOn: getColumnIndex(['last updated on', 'last updated']),
      lastUpdatedBy: getColumnIndex(['last updated by'])
    };

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const lead = {
        month: sheetName,
        date: columnMap.date !== -1 ? (row[columnMap.date] || '') : '',
        contact: columnMap.contact !== -1 ? (row[columnMap.contact] || '') : '',
        funnel: columnMap.funnel !== -1 ? (row[columnMap.funnel] || '') : '',
        stage: columnMap.stage !== -1 ? (row[columnMap.stage] || '') : '',
        rebuttal: columnMap.rebuttal !== -1 ? (row[columnMap.rebuttal] || '') : '',
        name: columnMap.name !== -1 ? (row[columnMap.name] || '') : '',
        companyName: columnMap.companyName !== -1 ? (row[columnMap.companyName] || '') : '',
        website: columnMap.website !== -1 ? (row[columnMap.website] || '') : '',
        industry: columnMap.industry !== -1 ? (row[columnMap.industry] || '') : '',
        email: columnMap.email !== -1 ? (row[columnMap.email] || '') : '',
        query: columnMap.query !== -1 ? (row[columnMap.query] || '') : '',
        comments: columnMap.comments !== -1 ? (row[columnMap.comments] || '') : '',
        followUpDate: columnMap.followUpDate !== -1 ? (row[columnMap.followUpDate] || '') : '',
        followUpTask: columnMap.followUpTask !== -1 ? (row[columnMap.followUpTask] || '') : '',
        followUpBy: columnMap.followUpBy !== -1 ? (row[columnMap.followUpBy] || '') : '',
        lastUpdatedOn: columnMap.lastUpdatedOn !== -1 ? (row[columnMap.lastUpdatedOn] || '') : '',
        lastUpdatedBy: columnMap.lastUpdatedBy !== -1 ? (row[columnMap.lastUpdatedBy] || '') : ''
      };

      if (lead.contact || lead.name) leads.push(lead);
    }

    return leads;
  };

  const handleClose = () => {
    if (!uploading && !processing) {
      setProgress(0);
      setStatus('');
      setError('');
      setSuccess(false);
      setStats(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Excel File & Import Leads</DialogTitle>
          <DialogDescription>
            Upload your marketing tracker Excel file. Leads will be automatically imported into the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!uploading && !processing && !success && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Choose an Excel file</p>
                <p className="text-xs text-muted-foreground">Supports .xlsx and .xls files</p>
              </div>
              <Button onClick={() => document.getElementById('excel-upload-input')?.click()}>
                Select File
              </Button>
              <input
                id="excel-upload-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {(uploading || processing) && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium">{status}</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {progress.toFixed(0)}% complete
              </p>
            </div>
          )}

          {success && stats && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Import completed successfully!</p>
                  <div className="text-sm space-y-1">
                    <p>• Total leads processed: {stats.total}</p>
                    <p>• New leads imported: {stats.imported}</p>
                    <p>• Existing leads updated: {stats.updated}</p>
                    {stats.skipped > 0 && <p>• Skipped (no contact/name): {stats.skipped}</p>}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading || processing}
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}