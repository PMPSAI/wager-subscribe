import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3, Megaphone, Target, Wallet, Zap, Webhook, Settings,
  LogOut, ChevronRight, Home, ShieldCheck, TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", icon: BarChart3, href: "/merchant" },
  { label: "Campaigns", icon: Megaphone, href: "/merchant/campaigns" },
  { label: "Intents", icon: Target, href: "/merchant/intents" },
  { label: "Widget Predictions", icon: TrendingUp, href: "/merchant/predictions" },
  { label: "Settlements", icon: Wallet, href: "/merchant/settlements" },
  { label: "Resolver", icon: Zap, href: "/merchant/resolver" },
  { label: "Webhook Test", icon: Webhook, href: "/merchant/webhook" },
  { label: "Settings (Stripe & Plan Prices)", icon: Settings, href: "/merchant/settings" },
];

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
      toast.success("Signed out");
      window.location.href = "/";
    },
    onError: () => {
      utils.auth.me.setData(undefined, null);
      window.location.href = "/";
    },
  });

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">IncentivPay</p>
              <p className="text-xs text-gray-500">Merchant Dashboard</p>
            </div>
          </div>
        </div>

        {/* Top utility links */}
        <div className="px-3 pt-3 pb-1 space-y-0.5 border-b border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all"
          >
            <Home className="w-3.5 h-3.5 text-gray-400" />
            Back to Home
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Portal
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/merchant" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", active ? "text-emerald-600" : "text-gray-400")} />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-4">
          <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
