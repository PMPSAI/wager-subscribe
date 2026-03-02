import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Users, Trophy, TrendingUp, Zap, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function MerchantDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: kpis, isLoading, refetch } = trpc.merchant.kpis.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const { data: campaigns } = trpc.campaign.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const resolverMutation = trpc.resolver.runWeekly.useMutation({
    onSuccess: (data) => {
      toast.success(`Resolver complete: ${data.wins} wins, ${data.losses} losses out of ${data.processed} intents`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const pauseAllMutation = trpc.merchant.pauseAllCampaigns.useMutation({
    onSuccess: () => {
      toast.success("All campaigns paused (kill switch)");
      refetch();
      void utils.campaign.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  return (
    <MerchantLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your campaign performance</p>
        </div>
        <Button
          onClick={() => resolverMutation.mutate()}
          disabled={resolverMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Zap className="w-4 h-4" />
          {resolverMutation.isPending ? "Running..." : "Run Weekly Resolution"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Intents (30d)"
            value={kpis?.intents30d ?? 0}
            sub={`${kpis?.intents7d ?? 0} in last 7 days`}
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            label="Total Wins"
            value={kpis?.totalWins ?? 0}
            sub={`of ${kpis?.totalResolutions ?? 0} resolved`}
            icon={Trophy}
            color="bg-emerald-500"
          />
          <StatCard
            label="Win Rate"
            value={`${kpis?.winRate ?? 0}%`}
            sub={`$${kpis?.awardsAppliedUsd ?? 0} applied`}
            icon={TrendingUp}
            color="bg-violet-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* System Health */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Integration and processing status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Stripe Connection</span>
              {kpis?.stripeConnected ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3 h-3" /> Disconnected
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Settlement Success</span>
              <span className="text-sm font-medium text-gray-900">{kpis?.settlementSuccessRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Failed Settlements</span>
              {(kpis?.failedSettlements ?? 0) > 0 ? (
                <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {kpis.failedSettlements}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-900">0</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Retry Queue</span>
              <span className="text-sm font-medium text-gray-900">{kpis?.retryQueueSize ?? 0} pending</span>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={pauseAllMutation.isPending}
              onClick={() => pauseAllMutation.mutate()}
            >
              Pause All Campaigns (Kill Switch)
            </Button>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Status over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.slice(0, 10).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "success" : "secondary"}>
                          {c.isActive ? "active" : "paused"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">No campaigns yet. Create one from the Campaigns page.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Billing Integration</h2>
        <p className="text-sm text-gray-500 mb-3">How incentive settlement connects to your billing</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          In production, Stripe webhooks update the{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">subscription_status</code>{" "}
          for each user when subscription events occur. The weekly resolution process only includes intents
          whose user has an &quot;active&quot; subscription status.
        </p>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Use the <strong>Webhook Test</strong> page to simulate Stripe webhook updates. Use <strong>Settings</strong> for
          installation snippet and branding.
        </p>
      </div>
    </MerchantLayout>
  );
}
