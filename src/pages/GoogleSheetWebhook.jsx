import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleSheetSync } from '@/entities/GoogleSheetSync';
import { Lead } from '@/entities/Lead';

export default function GoogleSheetWebhook() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate webhook URL
    const currentUrl = window.location.origin;
    const webhook = `${currentUrl}/api/google-sheet-sync`;
    setWebhookUrl(webhook);
    
    loadSyncHistory();
  }, []);

  const loadSyncHistory = async () => {
    setLoading(true);
    const history = await GoogleSheetSync.list('-lastSyncDate', 10);
    setSyncHistory(history);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appsScriptCode = `// Google Apps Script for AgentUI Marketing CRM Sync
// Instructions:
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this entire script
// 4. Replace YOUR_WEBHOOK_URL with the webhook URL below
// 5. Save the script (Ctrl+S or Cmd+S)
// 6. Click "Run" > "setupTrigger" to enable automatic syncing
// 7. Authorize the script when prompted

const WEBHOOK_URL = '${webhookUrl}';

// Main function to sync data
function syncToAgentUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  // Find all monthly lead sheets (March Leads, April Leads, etc.)
  const leadSheets = sheets.filter(sheet => {
    const name = sheet.getName();
    return name.includes('Leads') && !name.includes('Centralised');
  });
  
  const allLeadsData = [];
  
  leadSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const data = sheet.getDataRange().getValues();
    
    if (data.length > 1) {
      const headers = data[0];
      
      // Process each row (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Skip empty rows
        if (!row[0] && !row[1] && !row[2]) continue;
        
        const leadData = {
          sheetName: sheetName,
          date: row[0] ? row[0].toString() : '',
          contact: row[1] ? row[1].toString() : '',
          funnel: row[2] ? row[2].toString() : '',
          stage: row[3] ? row[3].toString() : '',
          name: row[4] ? row[4].toString() : '',
          companyName: row[5] ? row[5].toString() : '',
          website: row[6] ? row[6].toString() : '',
          industry: row[7] ? row[7].toString() : '',
          query: row[8] ? row[8].toString() : '',
          email: row[9] ? row[9].toString() : '',
          comments: row[10] ? row[10].toString() : '',
          followUpDate: row[11] ? row[11].toString() : '',
          followUpTask: row[12] ? row[12].toString() : '',
          followUpBy: row[13] ? row[13].toString() : '',
          lastUpdatedOn: row[14] ? row[14].toString() : '',
          lastUpdatedBy: row[15] ? row[15].toString() : '',
          month: extractMonthFromSheetName(sheetName)
        };
        
        allLeadsData.push(leadData);
      }
    }
  });
  
  // Send data to webhook
  const payload = {
    sheetId: ss.getId(),
    sheetName: ss.getName(),
    timestamp: new Date().toISOString(),
    leads: allLeadsData,
    totalRecords: allLeadsData.length
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Sync successful: ' + allLeadsData.length + ' leads synced');
      return true;
    } else {
      Logger.log('Sync failed with code: ' + responseCode);
      return false;
    }
  } catch (error) {
    Logger.log('Error syncing: ' + error.toString());
    return false;
  }
}

// Extract month from sheet name (e.g., "March Leads" -> "March")
function extractMonthFromSheetName(sheetName) {
  const match = sheetName.match(/^([A-Za-z]+)\\s+Leads/);
  return match ? match[1] : sheetName;
}

// Setup automatic trigger to run on edit
function setupTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new trigger for on edit
  ScriptApp.newTrigger('syncToAgentUI')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  // Create time-based trigger (every hour as backup)
  ScriptApp.newTrigger('syncToAgentUI')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Triggers setup successfully');
  SpreadsheetApp.getUi().alert('Sync triggers setup successfully! Your sheet will now sync automatically.');
}

// Manual sync function (can be run from menu)
function manualSync() {
  const ui = SpreadsheetApp.getUi();
  const result = syncToAgentUI();
  
  if (result) {
    ui.alert('Success', 'Data synced successfully to AgentUI!', ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed to sync data. Check the logs for details.', ui.ButtonSet.OK);
  }
}

// Add custom menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('AgentUI Sync')
    .addItem('Setup Auto-Sync', 'setupTrigger')
    .addItem('Manual Sync Now', 'manualSync')
    .addToUi();
}`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Sheet Integration</h1>
        <p className="text-muted-foreground">Connect your Google Sheet to automatically sync leads</p>
      </div>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Copy Your Webhook URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is your unique webhook URL. You'll need this for the Google Apps Script.
          </p>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {copied && (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Copied to clipboard!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Apps Script Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Setup Google Apps Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="font-medium">Follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open your Google Sheet with the marketing data</li>
              <li>Click on <strong>Extensions</strong> → <strong>Apps Script</strong></li>
              <li>Delete any existing code in the editor</li>
              <li>Copy the script below and paste it into the Apps Script editor</li>
              <li>The webhook URL is already included in the script</li>
              <li>Click <strong>Save</strong> (💾 icon or Ctrl+S)</li>
              <li>Click <strong>Run</strong> → Select <strong>setupTrigger</strong></li>
              <li>Authorize the script when prompted (click "Review Permissions")</li>
              <li>Done! Your sheet will now sync automatically on every edit</li>
            </ol>
          </div>

          <div className="relative">
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
              <code>{appsScriptCode}</code>
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(appsScriptCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Script
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sync History</CardTitle>
            <Button size="sm" variant="outline" onClick={loadSyncHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading sync history...</p>
          ) : syncHistory.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No sync history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Once you setup the Google Apps Script, sync events will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncHistory.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {sync.syncStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{sync.sheetName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sync.recordsSynced} records synced
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(sync.lastSyncDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Automatic Detection</p>
              <p className="text-muted-foreground">
                The script automatically finds all sheets named like "March Leads", "April Leads", "Jan 26 Leads", etc.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Real-time Sync</p>
              <p className="text-muted-foreground">
                Every time you edit your Google Sheet, the data automatically syncs to your dashboard
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Backup Sync</p>
              <p className="text-muted-foreground">
                A backup sync runs every hour to ensure data stays up-to-date
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}