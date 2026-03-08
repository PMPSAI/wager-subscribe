import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Target, Trophy, Clock, DollarSign, Star, RefreshCw, Plus,
  CheckCircle, XCircle, AlertCircle, Wallet, Activity, CreditCard, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

// All data comes from live API — no mock data

function Countdown({ to }: { to: Date | string }) {
  const target = new Date(to).getTime();
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const t = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (remaining <= 0) return <span className="text-red-500 font-semibold text-sm">Expired</span>;

  const days = Math.floor(remaining / 86400000);
  const hrs = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 text-sm font-mono">
      {days > 0 && <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">{days}d</span>}
      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">{String(hrs).padStart(2,"0")}h</span>
      <span className="text-gray-400">:</span>
      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">{String(mins).padStart(2,"0")}m</span>
      <span className="text-gray-400">:</span>
      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">{String(secs).padStart(2,"0")}s</span>
    </div>
  );
}

const intentStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  TRACKING:           { label: "Tracking",        color: "bg-blue-100 text-blue-700",       icon: Clock },
  PENDING_RESOLUTION: { label: "Pending",          color: "bg-yellow-100 text-yellow-700",   icon: AlertCircle },
  RESOLVED_WIN:       { label: "Reward Earned",    color: "bg-emerald-100 text-emerald-700", icon: Trophy },
  RESOLVED_LOSS:      { label: "Not Achieved",     color: "bg-red-100 text-red-700",         icon: XCircle },
  CANCELLED:          { label: "Cancelled",        color: "bg-gray-100 text-gray-500",       icon: XCircle },
  CREATED:            { label: "Created",          color: "bg-gray-100 text-gray-600",       icon: Clock },
};

function IntentStatusBadge({ status }: { status: string }) {
  const cfg = intentStatusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-600", icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const { data, isLoading, refetch } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const billingPortalMutation = trpc.subscription.billingPortal.useMutation({
    onSuccess: (res) => { if (res.url) window.open(res.url, "_blank"); },
    onError: (e) => toast.error(e.message),
  });

  const stats = data?.stats;
  const intents = data?.intents ?? [];
  const balance = data?.balance;
  const ledger = data?.ledger ?? [];
  const subscription = data?.subscription;

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-2 flex justify-end">
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Incentives" value={stats?.totalIntents ?? 0} icon={Target} color="bg-blue-500" />
          <StatCard label="Tracking" value={stats?.trackingIntents ?? 0} icon={Clock} color="bg-yellow-500" />
          <StatCard label="Rewards Earned" value={stats?.wonIntents ?? 0} icon={Trophy} color="bg-emerald-500" />
          <StatCard label="Reward Balance" value={`$${(stats?.remainderUsd ?? 0).toFixed(2)}`} icon={DollarSign} color="bg-violet-500" />
        </div>

        {subscription ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Active Subscription</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>Plan: <strong className="text-gray-700">{subscription.planName}</strong></span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Active</span>
                  {subscription.currentPeriodEnd && (
                    <span>Renews: <strong className="text-gray-700">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong></span>
                  )}
                  <span className="font-mono text-gray-400 truncate max-w-[180px]">
                    {subscription.stripeSubscriptionId?.slice(0, 24)}...
                  </span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-8"
              disabled={billingPortalMutation.isPending}
              onClick={() => billingPortalMutation.mutate()}
            >
              Manage Billing
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 mb-6 text-center">
            <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No active subscription</p>
            <p className="text-sm text-gray-400 mt-1">Subscribe to a plan to activate your first performance incentive.</p>
            <Link href="/plans">
              <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">View Plans <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        )}

        {balance && parseFloat(balance.remainderUsd ?? "0") > 0 && (
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 mb-6 text-white flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Available Reward Balance</p>
              <p className="text-3xl font-bold mt-1">${parseFloat(balance.remainderUsd).toFixed(2)}</p>
              <p className="text-emerald-200 text-xs mt-1">Applied to your subscription billing</p>
            </div>
            <Wallet className="w-12 h-12 text-emerald-400 opacity-60" />
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Incentive History</h2>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
          ) : !intents.length ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incentives yet</p>
              <p className="text-sm text-gray-400 mt-1">Subscribe to a plan and select a condition to get started</p>
              <Link href="/plans">
                <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">Browse Plans</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {intents.map((intent: any) => {
                const terms = intent.termsSnapshot as any;
                const isWin = intent.status === "RESOLVED_WIN";
                const isTracking = intent.status === "TRACKING" || intent.status === "PENDING_RESOLUTION";
                return (
                  <div key={intent.id} className={`bg-white rounded-xl border p-5 ${isWin ? "border-emerald-200" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{terms?.conditionLabel ?? `Incentive #${intent.id}`}</p>
                        {terms?.conditionDescription && (
                          <p className="text-sm text-gray-500 mt-0.5">{terms.conditionDescription}</p>
                        )}
                      </div>
                      <IntentStatusBadge status={intent.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                      <div>
                        <p className="text-gray-400 mb-0.5">Incentive ID</p>
                        <p className="font-mono font-semibold text-gray-700">#{intent.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Transaction ID</p>
                        <p className="font-mono text-gray-600">{intent.transactionId ? `#${intent.transactionId}` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Activated</p>
                        <p className="font-semibold text-gray-700">{new Date(intent.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Resolves</p>
                        <p className="font-semibold text-gray-700">{intent.resolveAt ? new Date(intent.resolveAt).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>

                    {isTracking && intent.resolveAt && (
                      <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-blue-700 font-medium">Time remaining</span>
                        </div>
                        <Countdown to={intent.resolveAt} />
                      </div>
                    )}

                    {isWin && terms?.rewardValueUsd && (
                      <div className="bg-emerald-50 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-xs font-bold text-emerald-700">REWARD APPLIED</p>
                            <p className="text-sm font-bold text-emerald-800">${parseFloat(terms.rewardValueUsd).toFixed(2)} credit applied to account</p>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}

                    {intent.status === "RESOLVED_LOSS" && (
                      <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-600">Condition not met within the resolution window</p>
                          <p className="text-xs text-gray-400">Your subscription continues normally at the standard rate.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {ledger.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" /> Activity Ledger
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Event", "Amount", "Date"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledger.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{entry.description}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{entry.eventType}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-semibold ${parseFloat(entry.amountUsd ?? "0") > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                          {parseFloat(entry.amountUsd ?? "0") > 0 ? `+$${parseFloat(entry.amountUsd ?? "0").toFixed(2)}` : "$0.00"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
