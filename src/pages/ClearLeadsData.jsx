import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Lead } from '@/entities/Lead';
import { Task } from '@/entities/Task';
import { ExcelFile } from '@/entities/ExcelFile';
import { GoogleSheetSync } from '@/entities/GoogleSheetSync';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClearLeadsData() {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [progress, setProgress] = useState('');
  const [counts, setCounts] = useState({
    leads: 0,
    tasks: 0,
    excelFiles: 0,
    googleSheetSyncs: 0
  });

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL data from the database including:\n\n• All Leads\n• All Tasks\n• All Excel Files\n• All Google Sheet Syncs\n\nThis action CANNOT be undone. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('This is your FINAL confirmation. Click OK to proceed with permanent deletion of ALL data.')) {
      return;
    }

    setClearing(true);
    const newCounts = { leads: 0, tasks: 0, excelFiles: 0, googleSheetSyncs: 0 };

    try {
      // Clear Leads
      setProgress('Deleting all leads...');
      const allLeads = await Lead.list('-createdAt', 10000);
      newCounts.leads = allLeads.length;
      for (const lead of allLeads) {
        await Lead.delete(lead.id);
      }

      // Clear Tasks
      setProgress('Deleting all tasks...');
      const allTasks = await Task.list('-createdAt', 10000);
      newCounts.tasks = allTasks.length;
      for (const task of allTasks) {
        await Task.delete(task.id);
      }

      // Clear Excel Files
      setProgress('Deleting all excel files...');
      const allExcelFiles = await ExcelFile.list('-createdAt', 10000);
      newCounts.excelFiles = allExcelFiles.length;
      for (const file of allExcelFiles) {
        await ExcelFile.delete(file.id);
      }

      // Clear Google Sheet Syncs
      setProgress('Deleting all google sheet syncs...');
      const allSyncs = await GoogleSheetSync.list('-createdAt', 10000);
      newCounts.googleSheetSyncs = allSyncs.length;
      for (const sync of allSyncs) {
        await GoogleSheetSync.delete(sync.id);
      }

      setCounts(newCounts);
      setCleared(true);
      setProgress('Complete!');
      
      const totalDeleted = newCounts.leads + newCounts.tasks + newCounts.excelFiles + newCounts.googleSheetSyncs;
      alert(`✅ Successfully deleted ${totalDeleted} total records from the database!`);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('❌ Failed to clear all data. Please try again.');
      setProgress('Error occurred');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="container mx-auto max-w-2xl">
        <Card className="border-red-300 shadow-lg">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Clear All Data - Fresh Start
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {!cleared ? (
              <>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Critical Warning</h3>
                  <p className="text-sm text-yellow-700">
                    This action will permanently delete <strong>ALL DATA</strong> from your entire database. 
                    This includes leads, tasks, excel files, and all sync configurations.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">What will be deleted:</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>🗑️ All lead records (contact info, stages, funnels, comments)</li>
                    <li>🗑️ All tasks (pending, completed, overdue)</li>
                    <li>🗑️ All uploaded Excel files</li>
                    <li>🗑️ All Google Sheet sync configurations</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 After Clearing</h4>
                  <p className="text-sm text-blue-700">
                    You'll have a completely clean database ready for fresh data. You can then:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Upload a new Excel file from the Dashboard</li>
                    <li>• Manually add leads in the Leads Table</li>
                    <li>• Set up new Google Sheet syncs</li>
                  </ul>
                </div>

                {clearing && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-sm font-medium">{progress}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleClearAllData}
                    disabled={clearing}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {clearing ? 'Clearing All Data...' : 'Clear All Data'}
                  </Button>
                  <Link to={createPageUrl('Dashboard')} className="flex-1">
                    <Button variant="outline" className="w-full" disabled={clearing}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <h3 className="text-xl font-semibold text-green-700">
                  Successfully Cleared All Data!
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Deletion Summary:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-muted-foreground">Leads:</span>
                      <span className="font-semibold ml-2">{counts.leads}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-muted-foreground">Tasks:</span>
                      <span className="font-semibold ml-2">{counts.tasks}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-muted-foreground">Excel Files:</span>
                      <span className="font-semibold ml-2">{counts.excelFiles}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-muted-foreground">Sheet Syncs:</span>
                      <span className="font-semibold ml-2">{counts.googleSheetSyncs}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-800 pt-2">
                    Total: {counts.leads + counts.tasks + counts.excelFiles + counts.googleSheetSyncs} records deleted
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Your database is now completely clean and ready for fresh data!
                </p>
                <div className="flex gap-3 pt-4">
                  <Link to={createPageUrl('Dashboard')} className="flex-1">
                    <Button className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to={createPageUrl('LeadsTable')} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Add New Leads
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}