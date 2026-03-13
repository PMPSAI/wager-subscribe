import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Zap, ArrowRight, Star, Crown, Rocket, TrendingUp, Trophy, Shield } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import Navbar from "@/components/Navbar";

const TIER_ICONS = {
  starter: <Rocket size={22} className="text-blue-500" />,
  pro: <TrendingUp size={22} className="text-primary" />,
  elite: <Crown size={22} className="text-amber-500" />,
};

const TIER_GRADIENT = {
  starter: "from-blue-50 to-indigo-50",
  pro: "from-violet-50 to-purple-50",
  elite: "from-amber-50 to-orange-50",
};

const TIER_BORDER = {
  starter: "border-blue-200",
  pro: "border-violet-300 ring-2 ring-violet-400/30",
  elite: "border-amber-200",
};

export default function Plans() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(typeof search === "string" ? search : "");
  const merchantSlug = urlParams.get("slug") || undefined;

  const { data: plansData, isLoading } = trpc.subscription.plans.useQuery({ merchantSlug });
  const plans = plansData?.plans;
  const stripeMode = plansData?.stripeMode;
  const createCheckout = trpc.subscription.createCheckoutSession.useMutation();

  const handleSubscribe = async (tier: "starter" | "pro" | "elite") => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent("/plans" + (search ? "?" + search : ""))}`);
      return;
    }
    try {
      toast.loading("Redirecting to checkout...", { id: "checkout" });
      const result = await createCheckout.mutateAsync({ planTier: tier, merchantSlug });
      toast.dismiss("checkout");
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (err: unknown) {
      toast.dismiss("checkout");
      const msg = err instanceof Error ? err.message : "Failed to create checkout session";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Stripe mode banner */}
      {stripeMode === "live" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Live mode active</span> — payments will be charged to your real card.
            Use test card <code className="bg-amber-100 px-1 rounded">4242 4242 4242 4242</code> only in sandbox environments.
          </p>
        </div>
      )}
      {stripeMode === "test" && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-center">
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Sandbox / Test mode</span> — no real charges.
            Use test card <code className="bg-emerald-100 px-1 rounded">4242 4242 4242 4242</code>.
          </p>
        </div>
      )}
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container max-w-5xl mx-auto py-16 text-center">
          <Badge variant="outline" className="mb-5 bg-primary/5 text-primary border-primary/20">
            <Zap size={12} className="mr-1.5" fill="currentColor" />
            Subscription + Performance Incentive Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Subscribe. Select a Condition.
            <br />
            <span className="text-primary">Earn Your Reward.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every plan includes a performance incentive. Choose a real-world condition after payment — if it occurs within 30 days, you earn a subscription credit equal to your plan value. Rewards are not cash and have no monetary value outside of IncentivPay.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield size={14} className="text-green-500" /> Stripe-secured payments</span>
            <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-500" /> Reward tied to transaction ID</span>
            <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-blue-500" /> 30-day tracking window</span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="container max-w-5xl mx-auto py-16 px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[520px] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans?.map((plan) => (
              <Card
                key={plan.tier}
                className={`relative rounded-2xl border-2 bg-gradient-to-br ${TIER_GRADIENT[plan.tier as keyof typeof TIER_GRADIENT]} ${TIER_BORDER[plan.tier as keyof typeof TIER_BORDER]} transition-all duration-200 hover:shadow-xl hover:-translate-y-1`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <CardHeader className="pb-4 pt-7">
                  <div className="flex items-center gap-2 mb-3">
                    {TIER_ICONS[plan.tier as keyof typeof TIER_ICONS]}
                    <span className="font-bold text-foreground text-lg">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                      ${(plan.amountCents / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground font-medium">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Cancel anytime · No hidden fees</p>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle2 size={15} className="text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Performance Incentive */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Star size={13} className="text-primary" fill="currentColor" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Performance Incentive</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {plan.rewardDescription}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Select a condition after payment. If achieved within 30 days, a subscription credit is applied to your account. Credits are non-cash and non-transferable.
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Available conditions: </span>
                    {plan.conditionCategories.join(", ")}
                  </div>

                  <Button
                    className="w-full gap-2 font-semibold"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSubscribe(plan.tier as "starter" | "pro" | "elite")}
                    disabled={createCheckout.isPending}
                  >
                    Get {plan.name} <ArrowRight size={16} />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Test card: <code className="bg-muted px-1 py-0.5 rounded">4242 4242 4242 4242</code>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Compliance Disclosure */}
        <div className="mt-10 border border-border rounded-xl p-5 text-xs text-muted-foreground max-w-3xl mx-auto space-y-2 bg-muted/30">
          <p className="font-semibold text-foreground text-sm">Important Disclosure</p>
          <p>All plans are billed monthly via Stripe and may be cancelled at any time from your account settings. Cancellation takes effect at the end of the current billing period.</p>
          <p>IncentivPay performance incentives are <strong>not</strong> a financial product, investment vehicle, insurance product, gambling service, or money-services business. No cash, prizes, or monetary transfers are made to subscribers. Rewards are issued exclusively as subscription credits applied to future IncentivPay billing cycles. Subscription credits have no cash value, are non-transferable, and cannot be redeemed for cash or any other monetary equivalent.</p>
          <p>Incentive conditions are tracked against publicly available third-party data sources. Condition outcomes are determined solely by IncentivPay's resolver process and are final. Past condition outcomes are not indicative of future results. By subscribing, you agree to the IncentivPay Terms of Service.</p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">Already subscribed?</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go to My Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
