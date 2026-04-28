import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Task } from '@/entities/Task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';

export default function TaskReminderCron() {
  const [status, setStatus] = useState('Processing...');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    sendDailyReminders();
  }, []);

  const sendDailyReminders = async () => {
    try {
      // Get all pending tasks for today and overdue
      const allTasks = await Task.list('-scheduledDate', 1000);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter tasks that are due today or overdue
      const relevantTasks = allTasks.filter(task => {
        if (task.status === 'completed') return false;
        
        const taskDate = new Date(task.scheduledDate);
        taskDate.setHours(0, 0, 0, 0);
        
        // Include overdue and today's tasks
        return taskDate <= today;
      });
      
      // Group tasks by assignee
      const tasksByAssignee = {
        'sujay@scgbsolutions.com': [],
        'thanuja@scgbsolutions.com': []
      };
      
      relevantTasks.forEach(task => {
        if (task.assignedTo && tasksByAssignee[task.assignedTo]) {
          tasksByAssignee[task.assignedTo].push(task);
        }
      });
      
      const emailResults = [];
      
      // Send emails to each person with tasks
      for (const [email, tasks] of Object.entries(tasksByAssignee)) {
        if (tasks.length === 0) continue;
        
        const name = email.includes('sujay') ? 'Sujay' : 'Thanuja';
        
        // Separate overdue and today's tasks
        const overdueTasks = tasks.filter(t => {
          const taskDate = new Date(t.scheduledDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate < today;
        });
        
        const todayTasks = tasks.filter(t => {
          const taskDate = new Date(t.scheduledDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        });
        
        // Build email HTML
        let emailHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Good Morning ${name}! 🌅</h2>
            <p>Here's your task summary for today:</p>
        `;
        
        if (overdueTasks.length > 0) {
          emailHTML += `
            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ Overdue Tasks (${overdueTasks.length})</h3>
              <ul style="margin: 10px 0;">
          `;
          
          overdueTasks.forEach(task => {
            const dueDate = new Date(task.scheduledDate).toLocaleDateString();
            emailHTML += `
              <li style="margin: 10px 0;">
                <strong>${task.title}</strong><br/>
                <span style="color: #666; font-size: 14px;">Due: ${dueDate}</span><br/>
                ${task.leadName ? `<span style="color: #666; font-size: 14px;">Lead: ${task.leadName}</span><br/>` : ''}
                ${task.description ? `<span style="color: #666; font-size: 14px;">${task.description}</span>` : ''}
              </li>
            `;
          });
          
          emailHTML += `</ul></div>`;
        }
        
        if (todayTasks.length > 0) {
          emailHTML += `
            <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin-top: 0;">📅 Today's Tasks (${todayTasks.length})</h3>
              <ul style="margin: 10px 0;">
          `;
          
          todayTasks.forEach(task => {
            emailHTML += `
              <li style="margin: 10px 0;">
                <strong>${task.title}</strong><br/>
                ${task.leadName ? `<span style="color: #666; font-size: 14px;">Lead: ${task.leadName}</span><br/>` : ''}
                ${task.description ? `<span style="color: #666; font-size: 14px;">${task.description}</span>` : ''}
              </li>
            `;
          });
          
          emailHTML += `</ul></div>`;
        }
        
        emailHTML += `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 14px;">
                Total pending tasks: <strong>${tasks.length}</strong><br/>
                Have a productive day! 💪
              </p>
            </div>
          </div>
        `;
        
        // Send email
        try {
          await axios.post(
            `${process.env.PROXY_INTEGRATION_URL}/emails/send`,
            {
              to: email,
              subject: `Daily Task Reminder - ${overdueTasks.length} Overdue, ${todayTasks.length} Due Today`,
              html: emailHTML,
              text: `Good Morning ${name}! You have ${overdueTasks.length} overdue tasks and ${todayTasks.length} tasks due today.`
            },
            {
              headers: {
                'x-api-key': window.config.apiKey
              }
            }
          );
          
          emailResults.push({
            email,
            name,
            success: true,
            taskCount: tasks.length,
            overdue: overdueTasks.length,
            today: todayTasks.length
          });
        } catch (emailError) {
          console.error(`Error sending email to ${email}:`, emailError);
          emailResults.push({
            email,
            name,
            success: false,
            error: emailError.message
          });
        }
      }
      
      setResults(emailResults);
      setStatus('Completed');
      
    } catch (err) {
      console.error('Error in task reminder cron:', err);
      setError(err.message);
      setStatus('Failed');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Daily Task Reminder - Cron Job
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <span className={`px-3 py-1 rounded ${
                status === 'Completed' ? 'bg-green-100 text-green-800' :
                status === 'Failed' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {status}
              </span>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {results && results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Email Results:</h3>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded p-4 ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.name} ({result.email})</p>
                        {result.success ? (
                          <div className="text-sm text-gray-700 mt-1">
                            <p>✅ Email sent successfully</p>
                            <p>📊 Total tasks: {result.taskCount}</p>
                            <p>⚠️ Overdue: {result.overdue}</p>
                            <p>📅 Due today: {result.today}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-700 mt-1">❌ {result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results && results.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-blue-800">No pending tasks found for today. No emails sent.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}