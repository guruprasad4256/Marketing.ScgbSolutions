import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, MessageSquareText } from "lucide-react";

// Import your components
import BulkCampaign from "../components/BulkMessaging"; 
import SingleCampaign from "../components/BulkSheetMessaging"; 

export default function CampaignManager() {
  // "bulk" is the default state
  const [activeTab, setActiveTab] = useState("bulk");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 w-full">
      <div className="w-full space-y-6">
        
        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col gap-1 px-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Campaign Manager
          </h1>
          <p className="text-muted-foreground">
            Choose your messaging method to reach your audience.
          </p>
        </div>

        {/* --- TAB NAVIGATION --- */}
        <div className="flex items-center justify-start gap-2 bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-xl w-fit border shadow-sm ml-2">
          <Button
            variant={activeTab === "bulk" ? "default" : "ghost"}
            className={`rounded-lg px-8 transition-all duration-200 ${
              activeTab === "bulk" 
                ? "shadow-md bg-white dark:bg-slate-800 text-blue-600 font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600" 
                : "text-slate-600 hover:text-blue-600"
            }`}
            onClick={() => setActiveTab("bulk")}
          >
            <Users className="w-4 h-4 mr-2" />
            Bulk Messaging
          </Button>
          
          <Button
            variant={activeTab === "single" ? "default" : "ghost"}
            className={`rounded-lg px-8 transition-all duration-200 ${
              activeTab === "single" 
                ? "shadow-md bg-white dark:bg-slate-800 text-blue-600 font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600" 
                : "text-slate-600 hover:text-blue-600"
            }`}
            onClick={() => setActiveTab("single")}
          >
            <MessageSquareText className="w-4 h-4 mr-2" />
            Custom Messaging
          </Button>
        </div>

        {/* --- CONTENT AREA (FULL WIDTH) --- */}
        <div className="w-full">
          {activeTab === "bulk" ? (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <BulkCampaign />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <SingleCampaign />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}