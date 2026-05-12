import { AdminLayout, AdminPageHeader, OnboardingStatusBadge } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Building2, Users, TrendingUp, Activity, Clock, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, DollarSign, BarChart3,
} from "lucide-react";

function StatCard({
  title, value, subtitle, icon: Icon, color = "violet",
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.violet}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { data, isLoading } = trpc.admin.overview.useQuery();

  const stats = data?.stats;
  const merchants = data?.merchants ?? [];
  const users = data?.users ?? [];
  const intents = data?.intents ?? [];
  const markets = data?.markets ?? [];

  const pendingMerchants = merchants.filter((m: any) => m.onboardingStatus === "pending_review");
  const recentMerchants = merchants.slice(0, 5);
  const recentUsers = users.slice(0, 5);

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminPageHeader title="Overview" subtitle="Platform health at a glance" />
        <div className="p-8 grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Overview"
        subtitle="Platform health at a glance"
        actions={
          <Link href="/admin/audit">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> View Audit Log
            </Button>
          </Link>
        }
      />

      <div className="p-8 space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Merchants" value={stats?.totalMerchants ?? 0} subtitle={`${stats?.activeMerchants ?? 0} active`} icon={Building2} color="violet" />
          <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} color="blue" />
          <StatCard title="Total Intents" value={stats?.totalIntents ?? 0} subtitle={`${stats?.pendingIntents ?? 0} tracking`} icon={TrendingUp} color="emerald" />
          <StatCard title="Active Markets" value={`${stats?.enabledMarkets ?? 0} / ${stats?.totalMarkets ?? 0}`} icon={BarChart3} color="amber" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Pending Approval" value={pendingMerchants.length} subtitle="Needs attention" icon={Clock} color={pendingMerchants.length > 0 ? "amber" : "slate"} />
          <StatCard title="Resolved Intents" value={stats?.resolvedIntents ?? 0} icon={CheckCircle2} color="emerald" />
          <StatCard title="Active Subscriptions" value={stats?.totalRevenue ?? 0} subtitle="Merchant plans" icon={DollarSign} color="violet" />
          <StatCard title="Markets Tracked" value={stats?.totalMarkets ?? 0} icon={Activity} color="blue" />
        </div>

        {/* Needs Attention */}
        {pendingMerchants.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold text-amber-800">
                    Needs Attention — {pendingMerchants.length} Merchant{pendingMerchants.length > 1 ? "s" : ""} Pending Review
                  </CardTitle>
                </div>
                <Link href="/admin/merchants/pending">
                  <Button variant="outline" size="sm" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 bg-white">
                    Review All <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingMerchants.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.slug} · {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Link href="/admin/merchants/pending">
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Merchants */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">Recent Merchants</CardTitle>
              <Link href="/admin/merchants">
                <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:text-violet-700 gap-1 h-7">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentMerchants.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No merchants yet</p>
              ) : recentMerchants.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <OnboardingStatusBadge status={m.onboardingStatus ?? "pending_review"} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">Recent Users</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:text-violet-700 gap-1 h-7">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No users yet</p>
              ) : recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.name ?? u.email}</p>
                      <p className="text-xs text-slate-400">{u.loginMethod} · {new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
