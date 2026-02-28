import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2, Zap, ArrowRight, TrendingUp, Trophy, BarChart3, Sparkles,
  Clock, AlertCircle, Loader2, ChevronRight,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  market: <TrendingUp size={16} className="text-blue-500" />,
  sports: <Trophy size={16} className="text-yellow-500" />,
  economy: <BarChart3 size={16} className="text-green-500" />,
  custom: <Sparkles size={16} className="text-purple-500" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  market: "Market",
  sports: "Sports",
  economy: "Economy",
  custom: "Custom",
};

const CATEGORY_COLORS: Record<string, string> = {
  market: "bg-blue-50 border-blue-200 text-blue-700",
  sports: "bg-yellow-50 border-yellow-200 text-yellow-700",
  economy: "bg-green-50 border-green-200 text-green-700",
  custom: "bg-purple-50 border-purple-200 text-purple-700",
};

interface IncentiveCondition {
  key: string;
  label: string;
  category: "market" | "sports" | "economy" | "custom";
  detail: string;
  availableFor: string[];
}

export default function IncentivSelect() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id") ?? "";

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  const { data: sessionData, isLoading: sessionLoading, refetch: refetchSession } =
    trpc.subscription.verifySession.useQuery(
      { sessionId },
      { enabled: !!sessionId && isAuthenticated, retry: 3 }
    );

  const { data: conditions, isLoading: conditionsLoading } = trpc.incentiv.conditions.useQuery(
    { planTier: sessionData?.transaction?.planTier ?? "starter" },
    { enabled: !!sessionData?.transaction }
  );

  const selectIncentive = trpc.incentiv.selectIncentive.useMutation({
    onSuccess: () => {
      toast.success("Incentive condition activated! Redirecting to your dashboard…");
      setTimeout(() => navigate("/dashboard"), 1500);
    },
    onError: (err) => {
      if (err.message.includes("Payment not yet confirmed")) {
        toast.error("Payment is still processing. Retrying in a few seconds…");
        setTimeout(() => {
          refetchSession();
          setPollCount((c) => c + 1);
        }, 3000);
      } else {
        toast.error(err.message);
      }
    },
  });

  // Auto-poll while payment is pending
  useEffect(() => {
    if (sessionData && sessionData.transaction.status === "pending" && pollCount < 10) {
      const timer = setTimeout(() => {
        refetchSession();
        setPollCount((c) => c + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionData, pollCount, refetchSession]);

  const handleConfirm = () => {
    if (!selectedKey || !sessionData) return;
    selectIncentive.mutate({
      transactionId: sessionData.transaction.id,
      conditionKey: selectedKey,
    });
  };

  const typedConditions = conditions as IncentiveCondition[] | undefined;
  const filteredConditions = typedConditions?.filter(
    (c) => activeCategory === "all" || c.category === activeCategory
  );
  const categories = ["all", ...Array.from(new Set(typedConditions?.map((c) => c.category) ?? []))];

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your payment…</p>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <AlertCircle size={40} className="text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">No session found</h2>
          <p className="text-muted-foreground text-sm">This page requires a valid payment session.</p>
          <Button onClick={() => navigate("/plans")} className="gap-2">View Plans <ArrowRight size={16} /></Button>
        </div>
      </div>
    );
  }

  if (sessionData?.transaction.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
            <Clock size={28} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Confirming your payment…</h2>
          <p className="text-muted-foreground text-sm">
            Stripe is processing your subscription. This usually takes a few seconds.
            {pollCount > 0 && ` (Attempt ${pollCount}/10)`}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Checking payment status…
          </div>
        </div>
      </div>
    );
  }

  if (sessionData?.incentive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Incentive Already Active</h2>
          <p className="text-muted-foreground text-sm">
            You already selected <strong>{sessionData.incentive.conditionLabel}</strong> for this transaction.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">View Dashboard <ArrowRight size={16} /></Button>
        </div>
      </div>
    );
  }

  const selectedCondition = typedConditions?.find((c) => c.key === selectedKey);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-foreground text-lg">IncentivPay</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 size={14} className="text-green-500" /> Payment confirmed
          </div>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="text-primary font-medium">Plans</span>
            <ChevronRight size={14} />
            <span className="text-primary font-medium">Payment</span>
            <ChevronRight size={14} />
            <span className="font-semibold text-foreground">Select Incentive Condition</span>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">
                {sessionData?.transaction.planName} subscription activated!
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                Transaction ID:{" "}
                <code className="bg-green-100 px-1.5 py-0.5 rounded text-xs font-mono">
                  {sessionData?.transaction.stripeSessionId?.slice(0, 28)}…
                </code>
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-foreground mb-2">Select Your Incentive Condition</h1>
          <p className="text-muted-foreground max-w-xl">
            Choose one real-world condition to track. If it occurs within the next <strong>30 days</strong>, you earn a performance reward of{" "}
            <strong className="text-primary">
              ${((sessionData?.transaction.amountCents ?? 0) / 100).toFixed(0)} in subscription credit
            </strong>.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {cat === "all" ? "All Conditions" : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Conditions grid */}
        {conditionsLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {filteredConditions?.map((condition: IncentiveCondition) => (
              <button
                key={condition.key}
                onClick={() => setSelectedKey(condition.key)}
                className={`text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                  selectedKey === condition.key
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${CATEGORY_COLORS[condition.category]}`}>
                    {CATEGORY_ICONS[condition.category]}
                    {CATEGORY_LABELS[condition.category]}
                  </span>
                  {selectedKey === condition.key && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{condition.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{condition.detail}</p>
              </button>
            ))}
          </div>
        )}

        {/* Confirmation panel */}
        {selectedCondition && (
          <div className="sticky bottom-4 bg-card border-2 border-primary/30 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Selected Condition</p>
                <p className="font-bold text-foreground">{selectedCondition.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  30-day tracking window · Reward: ${((sessionData?.transaction.amountCents ?? 0) / 100).toFixed(0)} subscription credit
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 font-bold shrink-0"
                onClick={handleConfirm}
                disabled={selectIncentive.isPending}
              >
                {selectIncentive.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Activating…</>
                ) : (
                  <>Activate Incentive <ArrowRight size={16} /></>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Once confirmed, your incentive condition is locked for this transaction and cannot be changed. IncentivPay is not a gambling product, financial product, or money-services business. Rewards are issued exclusively as non-cash, non-transferable subscription credits applied to future billing cycles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
