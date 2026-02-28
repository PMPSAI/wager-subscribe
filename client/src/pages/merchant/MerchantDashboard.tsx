import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Users, Trophy, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
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

  const { data: kpis, isLoading, refetch } = trpc.merchant.kpis.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const resolverMutation = trpc.resolver.runWeekly.useMutation({
    onSuccess: (data) => toast.success(`Resolver complete: ${data.wins} wins, ${data.losses} losses out of ${data.processed} intents`),
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
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Intents (30d)" value={kpis?.intents30d ?? 0} sub={`${kpis?.intents7d ?? 0} in last 7 days`} icon={Users} color="bg-blue-500" />
          <StatCard label="Total Wins" value={kpis?.totalWins ?? 0} sub={`of ${kpis?.totalResolutions ?? 0} resolved`} icon={Trophy} color="bg-emerald-500" />
          <StatCard label="Win Rate" value={`${kpis?.winRate ?? 0}%`} sub={`$${kpis?.awardsAppliedUsd ?? 0} applied`} icon={TrendingUp} color="bg-violet-500" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Billing Integration</h2>
        <p className="text-sm text-gray-500 mb-3">How incentive settlement connects to your billing</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          In production, Stripe webhooks update the{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">subscription_status</code>{" "}
          for each user when subscription events occur. The weekly resolution process only includes intents
          whose user has an "active" subscription status.
        </p>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Use the <strong>Webhook Test</strong> page to simulate Stripe webhook updates.
        </p>
      </div>
    </MerchantLayout>
  );
}
