/**
 * WagerSubscribe Embeddable Widget
 * 
 * This page serves as both:
 * 1. A standalone /widget route for testing
 * 2. The content loaded by the embed.js script via iframe
 * 
 * Flow: Select Plan → Stripe Checkout → Select Prediction → Track
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAuthMethods } from "@/_core/hooks/useAuthMethods";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Zap, Trophy, TrendingUp, Shield, ArrowRight, CheckCircle2,
  CreditCard, Target, Clock, Star, Crown, Rocket, Lock
} from "lucide-react";
import { useLocation, useSearch } from "wouter";

const TIER_CONFIG = {
  starter: { icon: Rocket, color: "blue", label: "Starter", price: "$9/mo" },
  pro: { icon: TrendingUp, color: "violet", label: "Pro", price: "$29/mo" },
  elite: { icon: Crown, color: "amber", label: "Elite", price: "$79/mo" },
};

type Step = "plan" | "auth" | "prediction" | "tracking";

export default function Widget() {
  const { user, isAuthenticated, loading } = useAuth();
  const { simpleLogin, oauth } = useAuthMethods();
  const [step, setStep] = useState<Step>("plan");
  const [selectedTier, setSelectedTier] = useState<"starter" | "pro" | "elite" | null>(null);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  // If returning from Stripe checkout, go to prediction step
  useEffect(() => {
    if (sessionId && isAuthenticated) {
      setStep("prediction");
    }
  }, [sessionId, isAuthenticated]);

  const { data: plans, isLoading: plansLoading } = trpc.subscription.plans.useQuery();
  const { data: sessionData } = trpc.subscription.verifySession.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId && isAuthenticated }
  );
  const { data: conditions } = trpc.incentiv.conditions.useQuery(
    { planTier: sessionData?.transaction?.planTier ?? "starter" },
    { enabled: !!sessionData?.transaction }
  );
  const { data: dashboardData } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: isAuthenticated && step === "tracking",
  });

  const createCheckout = trpc.subscription.createCheckoutSession.useMutation({
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
    onError: (e) => toast.error(e.message),
  });

  const selectIncentive = trpc.incentiv.selectIncentive.useMutation({
    onSuccess: () => {
      toast.success("Prediction activated!");
      setStep("tracking");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSelectPlan = (tier: "starter" | "pro" | "elite") => {
    setSelectedTier(tier);
    if (!isAuthenticated) {
      setStep("auth");
      return;
    }
    toast.loading("Redirecting to checkout...", { id: "checkout" });
    createCheckout.mutate({ planTier: tier });
  };

  const handleAuth = () => {
    if (simpleLogin) {
      window.location.href = `${window.location.origin}/api/simple-login?redirect=${encodeURIComponent(window.location.href)}`;
    } else if (oauth) {
      window.location.href = `${window.location.origin}/api/auth/redirect?redirect=${encodeURIComponent(window.location.href)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900">WagerSubscribe</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate("/plans")}>Plans</Button>
            {isAuthenticated ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                {user?.role === "admin" && (
                  <Button size="sm" variant="ghost" onClick={() => navigate("/merchant")}>Merchant</Button>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleAuth}>
                <Lock size={13} className="mr-1.5" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["plan", "auth", "prediction", "tracking"] as Step[]).map((s, i) => {
            const stepLabels = { plan: "Choose Plan", auth: "Sign In", prediction: "Pick Prediction", tracking: "Track & Earn" };
            const stepIndex = ["plan", "auth", "prediction", "tracking"].indexOf(step);
            const thisIndex = i;
            const isDone = thisIndex < stepIndex;
            const isCurrent = s === step;
            // Skip auth step if already authenticated
            if (s === "auth" && isAuthenticated) return null;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-0.5 ${isDone ? "bg-emerald-500" : "bg-gray-200"}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent ? "bg-emerald-600 text-white" :
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {isDone && <CheckCircle2 size={12} />}
                  {stepLabels[s]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step: Choose Plan */}
        {step === "plan" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscribe & Place Your Prediction</h1>
              <p className="text-gray-500 max-w-xl mx-auto">
                Choose a subscription plan. If your prediction comes true within 30 days, you earn subscription credits — up to 24 months free.
              </p>
            </div>
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-2xl border animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans?.map((plan) => {
                  const cfg = TIER_CONFIG[plan.tier];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={plan.tier}
                      className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                        plan.popular ? "border-violet-400 shadow-md" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSelectPlan(plan.tier)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-violet-600 text-white text-xs px-3">Most Popular</Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.tier === "starter" ? "bg-blue-100" :
                          plan.tier === "pro" ? "bg-violet-100" : "bg-amber-100"
                        }`}>
                          <Icon size={20} className={
                            plan.tier === "starter" ? "text-blue-600" :
                            plan.tier === "pro" ? "text-violet-600" : "text-amber-600"
                          } />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{plan.name}</p>
                          <p className="text-2xl font-bold text-gray-900">${(plan.amountCents / 100).toFixed(0)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy size={14} className="text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">Win Reward</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-800">{plan.rewardDescription}</p>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full gap-2 ${
                          plan.popular
                            ? "bg-violet-600 hover:bg-violet-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        disabled={createCheckout.isPending && selectedTier === plan.tier}
                        onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.tier); }}
                      >
                        <CreditCard size={14} />
                        {createCheckout.isPending && selectedTier === plan.tier ? "Redirecting..." : "Subscribe & Predict"}
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-1.5"><Shield size={14} /> Secured by Stripe</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Cancel anytime</div>
              <div className="flex items-center gap-1.5"><Trophy size={14} /> Real cash rewards</div>
            </div>
          </div>
        )}

        {/* Step: Auth */}
        {step === "auth" && !isAuthenticated && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to continue</h2>
              <p className="text-gray-500 mb-6">
                Create a free account or sign in to subscribe to the{" "}
                <strong>{selectedTier ? TIER_CONFIG[selectedTier].label : ""}</strong> plan and place your prediction.
              </p>
              <div className="space-y-3">
                {simpleLogin && (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleAuth}>
                    <Zap size={16} /> Sign In / Create Account
                  </Button>
                )}
                {oauth && (
                  <Button className="w-full gap-2" variant="outline" onClick={handleAuth}>
                    Sign In with OAuth <ArrowRight size={14} />
                  </Button>
                )}
              </div>
              <button
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
                onClick={() => setStep("plan")}
              >
                ← Back to plans
              </button>
            </div>
          </div>
        )}

        {/* Step: Pick Prediction */}
        {step === "prediction" && isAuthenticated && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <CheckCircle2 size={16} /> Payment successful! Now pick your prediction.
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Prediction Condition</h2>
              <p className="text-gray-500">If this condition is met within 30 days, you earn your reward automatically.</p>
            </div>
            {!sessionData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
              </div>
            ) : !conditions?.length ? (
              <div className="text-center py-12 text-gray-400">No conditions available for your plan tier.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {conditions.map((cond: any) => {
                  const catColors: Record<string, string> = {
                    market: "bg-blue-100 text-blue-700",
                    sports: "bg-orange-100 text-orange-700",
                    economy: "bg-green-100 text-green-700",
                    custom: "bg-purple-100 text-purple-700",
                  };
                  return (
                    <div
                      key={cond.key}
                      className="bg-white rounded-xl border-2 border-gray-200 p-5 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
                      onClick={() => {
                        if (!sessionData.transaction) return;
                        selectIncentive.mutate({
                          transactionId: sessionData.transaction.id,
                          conditionKey: cond.key,
                        });
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={`text-xs ${catColors[cond.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {cond.category.toUpperCase()}
                        </Badge>
                        <Target size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <p className="font-semibold text-gray-900 mb-1">{cond.label}</p>
                      <p className="text-sm text-gray-500 mb-4">{cond.detail}</p>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-gray-400" />
                        <span className="text-xs text-gray-400">30-day tracking window</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step: Tracking */}
        {step === "tracking" && isAuthenticated && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
              <p className="text-gray-500">Your prediction is now being tracked. We'll notify you when it resolves.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" /> Your Active Predictions
              </h3>
              {dashboardData?.intents?.filter((i: any) => i.status === "TRACKING").length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No active predictions yet. Check back soon.</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData?.intents?.filter((i: any) => i.status === "TRACKING").map((intent: any) => (
                    <div key={intent.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{(intent.termsSnapshot as any)?.conditionLabel ?? `Prediction #${intent.id}`}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Resolves: {intent.resolveAt ? new Date(intent.resolveAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">TRACKING</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => navigate("/dashboard")}>
                <ArrowRight size={14} /> Go to Full Dashboard
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep("plan")}>
                Subscribe Another Plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
