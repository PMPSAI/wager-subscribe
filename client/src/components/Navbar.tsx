/**
 * Shared top navigation bar used on all public-facing pages.
 * Always shows: Logo (→ Home), Plans, Widget.
 * When authenticated: Dashboard, and Merchant Portal (admin only).
 * When not authenticated: Sign In button.
 * Logout is available via a dropdown on the user avatar/name.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Zap, LogOut, ChevronDown, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Navbar() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
      toast.success("Signed out");
      navigate("/");
    },
    onError: () => {
      // Force clear even on error
      utils.auth.me.setData(undefined, null);
      navigate("/");
    },
  });

  const handleLogout = () => logoutMutation.mutate();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap size={16} className="text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-bold text-foreground text-lg">IncentivPay</span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Home</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/plans")}>Plans</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/widget")}>Widget</Button>

          {!loading && (
            isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  <LayoutDashboard size={14} />
                  Dashboard
                </Button>
                {user?.role === "admin" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 ml-1"
                    onClick={() => navigate("/merchant")}
                  >
                    <Settings size={14} />
                    Merchant Portal
                  </Button>
                )}
                {user?.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  >
                    <ShieldCheck size={14} />
                    Admin
                  </Button>
                )}
                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 ml-1">
                      <span className="max-w-[100px] truncate">{user?.name || user?.email || "Account"}</span>
                      <ChevronDown size={13} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> My Dashboard
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem onClick={() => navigate("/merchant")}>
                        <Settings className="mr-2 h-4 w-4" /> Merchant Portal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5 ml-1">
                Sign In
              </Button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
