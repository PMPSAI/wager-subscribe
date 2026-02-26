import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  BarChart3,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Rocket,
  Star,
  ArrowRight,
  RefreshCw,
  Loader2,
  Ban,
  CreditCard,
  Target,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: <Clock size={14} />,
    className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
  },
  won: {
    label: "Won",
    icon: <Trophy size={14} />,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  lost: {
    label: "Lost",
    icon: <XCircle size={14} />,
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  },
  expired: {
    label: "Expired",
    icon: <Ban size={14} />,
    className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: <Ban size={14} />,
    className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700",
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  market: <TrendingUp size={14} className="text-blue-500" />,
  sports: <Trophy size={14} className="text-yellow-500" />,
  economy: <BarChart3 size={14} className="text-green-500" />,
  custom: <Zap size={14} className="text-purple-500" />,
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Rocket size={16} className="text-primary" />,
  pro: <Star size={16} className="text-yellow-500" />,
  elite: <Crown size={16} className="text-amber-500" />,
};

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [simulatingId, setSimulatingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const resolveWager = trpc.wager.resolveWager.useMutation({
    onSuccess: () => {
      toast.success("Wager outcome updated!");
      refetch();
      setSimulatingId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setSimulatingId(null);
    },
  });

  const handleSimulate = async (wagerId: number, outcome: "won" | "lost") => {
    setSimulatingId(wagerId);
    await resolveWager.mutateAsync({ wagerId, outcome });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Target size={40} className="text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Sign in to view your dashboard</h2>
            <p className="text-muted-foreground">Track your wagers, subscriptions, and rewards.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl mx-auto py-10 px-4 space-y-6">
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? { total: 0, pending: 0, won: 0, lost: 0, totalRewardCents: 0 };
  const wagers = data?.wagers ?? [];
  const subscription = data?.subscription;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name ?? "there"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/plans")} className="gap-1.5">
              <CreditCard size={14} /> New Plan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Wagers", value: stats.total, icon: <Target size={18} className="text-primary" />, color: "bg-primary/5" },
            { label: "Pending", value: stats.pending, icon: <Clock size={18} className="text-yellow-500" />, color: "bg-yellow-50 dark:bg-yellow-950/20" },
            { label: "Won", value: stats.won, icon: <Trophy size={18} className="text-green-600" />, color: "bg-green-50 dark:bg-green-950/20" },
            { label: "Rewards Earned", value: formatCents(stats.totalRewardCents), icon: <Zap size={18} className="text-purple-500" />, color: "bg-purple-50 dark:bg-purple-950/20" },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-5 pb-5">
                <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Subscription */}
        {subscription ? (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {PLAN_ICONS[subscription.planTier]}
                Active Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-semibold text-foreground capitalize">{subscription.planName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 capitalize">
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Renews</p>
                  <p className="font-semibold text-foreground">
                    {subscription.currentPeriodEnd
                      ? formatDate(new Date(subscription.currentPeriodEnd))
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription ID</p>
                  <p className="font-mono text-xs text-foreground">{subscription.stripeSubscriptionId.slice(0, 20)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="py-8 text-center space-y-3">
              <CreditCard size={32} className="text-muted-foreground mx-auto" />
              <p className="font-semibold text-foreground">No active subscription</p>
              <p className="text-sm text-muted-foreground">Subscribe to a plan to start placing wagers.</p>
              <Button onClick={() => navigate("/plans")} className="gap-2">
                View Plans <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wager History */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Wager History</h2>

          {wagers.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="py-12 text-center space-y-3">
                <Target size={40} className="text-muted-foreground mx-auto" />
                <p className="font-semibold text-foreground">No wagers yet</p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to a plan and select your wager condition to get started.
                </p>
                <Button onClick={() => navigate("/plans")} className="gap-2">
                  Start with a Plan <ArrowRight size={16} />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {wagers.map((wager) => {
                const statusCfg = STATUS_CONFIG[wager.status] ?? STATUS_CONFIG.pending;
                const isWon = wager.status === "won";
                const isLost = wager.status === "lost";
                const isPending = wager.status === "pending";

                return (
                  <Card
                    key={wager.id}
                    className={`border-2 transition-all ${
                      isWon
                        ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10"
                        : isLost
                        ? "border-red-100 dark:border-red-900"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="pt-5 pb-5">
                      <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-foreground text-base">{wager.conditionLabel}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              CATEGORY_COLORS[wager.conditionCategory]
                            }`}>
                              {CATEGORY_ICONS[wager.conditionCategory]}
                              {wager.conditionCategory.charAt(0).toUpperCase() + wager.conditionCategory.slice(1)}
                            </span>
                          </div>
                          {wager.conditionDetail && (
                            <p className="text-sm text-muted-foreground">{wager.conditionDetail}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`flex items-center gap-1 shrink-0 ${statusCfg.className}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Metadata grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3 mb-4">
                        <div>
                          <p className="text-muted-foreground text-xs">Wager ID</p>
                          <p className="font-mono font-semibold text-foreground">#{wager.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Transaction ID</p>
                          <p className="font-mono font-semibold text-foreground">#{wager.transactionId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Placed</p>
                          <p className="font-semibold text-foreground">{formatDate(wager.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Expires</p>
                          <p className="font-semibold text-foreground">{formatDate(wager.expiresAt)}</p>
                        </div>
                      </div>

                      {/* Reward */}
                      {isWon ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                            <Trophy size={20} className="text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">Reward Applied</p>
                            <p className="font-bold text-green-800 dark:text-green-300 text-lg">{wager.rewardDescription}</p>
                            <p className="text-xs text-green-600/70 dark:text-green-400/70">{formatCents(wager.rewardValueCents)} credited to account</p>
                          </div>
                        </div>
                      ) : isLost ? (
                        <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                          <XCircle size={20} className="text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Condition not met</p>
                            <p className="text-sm text-muted-foreground">Subscription continues normally at standard rate.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Zap size={18} className="text-primary shrink-0" fill="currentColor" />
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-primary">Potential Reward</p>
                              <p className="font-bold text-foreground">{wager.rewardDescription}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800 text-xs">
                            <Clock size={11} className="mr-1" /> Tracking
                          </Badge>
                        </div>
                      )}

                      {/* Admin simulation controls */}
                      {user?.role === "admin" && isPending && (
                        <div className="mt-4 p-4 bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-700">
                          <p className="text-[10px] font-mono text-slate-400 mb-3 uppercase tracking-widest">
                            ⚠️ Admin Simulation Controls
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs"
                              onClick={() => handleSimulate(wager.id, "won")}
                              disabled={simulatingId === wager.id}
                            >
                              {simulatingId === wager.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                              Simulate: Outcome MET
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs"
                              onClick={() => handleSimulate(wager.id, "lost")}
                              disabled={simulatingId === wager.id}
                            >
                              {simulatingId === wager.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <XCircle size={12} className="mr-1" />}
                              Simulate: Outcome MISSED
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Missing CATEGORY_COLORS
const CATEGORY_COLORS: Record<string, string> = {
  market: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  sports: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
  economy: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  custom: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
};
