import React from 'react';
import { User, LogOut } from 'lucide-react';
import { api } from '@/utils/Api';
import { useNavigate } from 'react-router-dom';
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
  const { user } = useUser();
  const navigate = useNavigate();
  const userId = user?.userId || user?._id || null;
  const isPartner = user?.role?.isPartner;

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
      {/* Updated width to max-w-8xl (or you can use max-w-[1500px] to match your blog editor exactly) */}
      <div className="max-w-8xl mx-auto px-4 py-3 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* ✅ LEFT: Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate(isPartner ? "/partner-dashboard" : "/dashboard")}
            title="Go to Dashboard"
          >
            <img src={logo} alt="SCGB" className="h-10 w-20 md:w-auto" />
          </div>

          {/* ✅ RIGHT: Actions (Only User Menu & Logout) */}
          <div className="flex items-center gap-2">
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