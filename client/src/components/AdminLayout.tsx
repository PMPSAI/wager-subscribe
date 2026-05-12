import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Building2,
  Clock,
  Users,
  ShieldCheck,
  TrendingUp,
  ScrollText,
  Settings,
  Target,
  LogOut,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function AdminSidebarItem({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));

  return (
    <Link href={item.href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer group",
          isActive
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
        )}
      >
        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-violet-600")} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && (
          <Badge
            variant={item.badgeVariant ?? "secondary"}
            className={cn(
              "text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center",
              isActive ? "bg-white/20 text-white border-white/30" : ""
            )}
          >
            {item.badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: overview } = trpc.admin.overview.useQuery(undefined, {
    refetchInterval: 30000,
    retry: false,
  });

  const pendingCount = overview?.merchants?.filter((m: any) => m.onboardingStatus === "pending_review").length ?? 0;

  const navGroups: NavGroup[] = [
    {
      title: "Platform",
      items: [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
      ],
    },
    {
      title: "Merchants",
      items: [
        { label: "All Merchants", href: "/admin/merchants", icon: Building2 },
        {
          label: "Pending Approval",
          href: "/admin/merchants/pending",
          icon: Clock,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeVariant: "destructive",
        },
        { label: "Compliance", href: "/admin/compliance", icon: ShieldCheck },
      ],
    },
    {
      title: "Users",
      items: [
        { label: "All Users", href: "/admin/users", icon: Users },
      ],
    },
    {
      title: "Markets",
      items: [
        { label: "Prediction Markets", href: "/admin/markets", icon: TrendingUp },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Platform Settings", href: "/admin/settings", icon: Settings },
        { label: "Outreach Prospects", href: "/admin/prospects", icon: Target },
      ],
    },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-sm">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">IncentivPay</p>
              <p className="text-xs text-violet-600 font-medium mt-0.5">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Pending alert banner */}
        {pendingCount > 0 && (
          <div className="mx-3 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-700 font-medium">
              {pendingCount} merchant{pendingCount > 1 ? "s" : ""} awaiting review
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <AdminSidebarItem key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name ?? user?.email}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => logout()}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

/** Reusable page header for admin pages */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-8 pt-8 pb-6 border-b border-slate-200 bg-white">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Status badge for merchant onboarding status */
export function OnboardingStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending_review: { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
    suspended: { label: "Suspended", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const c = config[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", c.className)}>
      {c.label}
    </span>
  );
}
