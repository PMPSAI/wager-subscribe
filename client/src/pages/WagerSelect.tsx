import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  TrendingUp,
  Trophy,
  BarChart3,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
  Clock,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  market: <TrendingUp size={16} className="text-blue-500" />,
  sports: <Trophy size={16} className="text-yellow-500" />,
  economy: <BarChart3 size={16} className="text-green-500" />,
  custom: <Zap size={16} className="text-purple-500" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  market: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  sports: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
  economy: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  custom: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
};

export default function WagerSelect() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id") ?? "";

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = trpc.subscription.verifySession.useQuery(
    { sessionId },
    { enabled: !!sessionId && isAuthenticated, retry: 3, retryDelay: 2000 }
  );

  const { data: conditions, isLoading: conditionsLoading } = trpc.wager.conditions.useQuery(
    { planTier: sessionData?.transaction?.planTier ?? "starter" },
    { enabled: !!sessionData?.transaction }
  );

  const selectWager = trpc.wager.selectWager.useMutation();

  const handleConfirm = async () => {
    if (!selectedKey || !sessionData?.transaction) return;
    setConfirming(true);
    try {
      await selectWager.mutateAsync({
        transactionId: sessionData.transaction.id,
        conditionKey: selectedKey,
      });
      toast.success("Wager registered! Redirecting to your dashboard...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register wager";
      toast.error(msg);
      setConfirming(false);
    }
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 size={40} className="animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle size={40} className="text-warning mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Sign in required</h2>
            <p className="text-muted-foreground">Please sign in to complete your wager selection.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionId || sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle size={40} className="text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Session not found</h2>
            <p className="text-muted-foreground">
              We couldn't find your payment session. If you just completed payment, please wait a moment and refresh.
            </p>
            <Button variant="outline" onClick={() => navigate("/plans")}>
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment pending — webhook hasn't fired yet
  if (sessionData && !sessionData.canSelectWager && !sessionData.wager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
              <Clock size={32} className="text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Payment processing...</h2>
            <p className="text-muted-foreground">
              Your payment is being confirmed. This usually takes a few seconds. Please refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wager already selected
  if (sessionData?.wager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Wager already registered!</h2>
            <p className="text-muted-foreground">
              You already selected <strong>{sessionData.wager.conditionLabel}</strong> for this subscription.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full gap-2">
              View Dashboard <ArrowRight size={16} />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tx = sessionData?.transaction;
  const plan = tx ? { name: tx.planName, tier: tx.planTier, amountCents: tx.amountCents } : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <CheckCircle2 size={14} />
            Payment Confirmed
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Wager Condition</h1>
          <p className="text-muted-foreground">
            You're subscribed to the <strong>{plan?.name}</strong> plan. Now pick a real-world condition — if it happens within 30 days, you win your reward.
          </p>
        </div>

        {/* Transaction info */}
        {tx && (
          <div className="bg-muted rounded-xl p-4 mb-8 flex flex-wrap gap-4 justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Plan</span>
              <p className="font-semibold text-foreground capitalize">{tx.planName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Transaction ID</span>
              <p className="font-mono font-semibold text-foreground text-xs">#{tx.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Amount</span>
              <p className="font-semibold text-foreground">${(tx.amountCents / 100).toFixed(2)}/mo</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                Confirmed
              </Badge>
            </div>
          </div>
        )}

        {/* Conditions */}
        {conditionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {conditions?.map((condition) => {
              const isSelected = selectedKey === condition.key;
              return (
                <button
                  key={condition.key}
                  onClick={() => setSelectedKey(condition.key)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-primary shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                        )}
                        <span className="font-semibold text-foreground">{condition.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{condition.detail}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${CATEGORY_COLORS[condition.category]}`}>
                      {CATEGORY_ICONS[condition.category]}
                      {condition.category.charAt(0).toUpperCase() + condition.category.slice(1)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Confirm */}
        <div className="sticky bottom-6">
          <Button
            className="w-full gap-2 h-14 text-base font-bold shadow-lg"
            disabled={!selectedKey || confirming}
            onClick={handleConfirm}
          >
            {confirming ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Registering wager...
              </>
            ) : (
              <>
                Confirm Wager Selection <ArrowRight size={18} />
              </>
            )}
          </Button>
          {selectedKey && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              You selected: <strong>{conditions?.find((c) => c.key === selectedKey)?.label}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
