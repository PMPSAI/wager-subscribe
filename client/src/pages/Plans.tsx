import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Zap, ArrowRight, Star, Crown, Rocket, TrendingUp, Trophy, Shield } from "lucide-react";
import { useLocation } from "wouter";

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
  const { data: plans, isLoading } = trpc.subscription.plans.useQuery();
  const createCheckout = trpc.subscription.createCheckoutSession.useMutation();

  const handleSubscribe = async (tier: "starter" | "pro" | "elite") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    try {
      toast.loading("Redirecting to checkout...", { id: "checkout" });
      const result = await createCheckout.mutateAsync({ planTier: tier });
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
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-foreground text-lg">WagerSubscribe</span>
          </button>
          <nav className="flex items-center gap-3">
            {isAuthenticated && (
              <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            )}
          </nav>
        </div>
      </header>

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
            Every plan includes a performance incentive. Choose a real-world condition after payment — if it occurs within 30 days, you earn a reward equal to your subscription value.
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
                className={`relative rounded-2xl border-2 bg-gradient-to-br ${TIER_GRADIENT[plan.tier]} ${TIER_BORDER[plan.tier]} transition-all duration-200 hover:shadow-xl hover:-translate-y-1`}
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
                    {TIER_ICONS[plan.tier]}
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
                      Select a condition after payment. Achieved within 30 days = reward earned.
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Available conditions: </span>
                    {plan.wagerCategories.join(", ")}
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

        {/* Compliance note */}
        <div className="mt-10 text-center text-xs text-muted-foreground max-w-2xl mx-auto space-y-1">
          <p>All plans are billed monthly via Stripe and can be cancelled anytime from your account settings.</p>
          <p>Performance incentives are non-transferable, subject to 30-day tracking windows, and are not a financial product, investment vehicle, or gambling service. Rewards are issued as subscription credits.</p>
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
