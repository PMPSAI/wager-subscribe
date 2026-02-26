import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Zap, ArrowRight, Star, Crown, Rocket } from "lucide-react";
import { useLocation } from "wouter";

const TIER_ICONS = {
  starter: <Rocket size={22} className="text-primary" />,
  pro: <Star size={22} className="text-yellow-500" />,
  elite: <Crown size={22} className="text-amber-500" />,
};

const TIER_GRADIENT = {
  starter: "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
  pro: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
  elite: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
};

const TIER_BORDER = {
  starter: "border-blue-200 dark:border-blue-800",
  pro: "border-violet-300 dark:border-violet-700 ring-2 ring-violet-400/30",
  elite: "border-amber-200 dark:border-amber-800",
};

export default function Plans() {
  const { user, isAuthenticated } = useAuth();
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
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container max-w-5xl mx-auto py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Zap size={14} fill="currentColor" />
            Subscription + Wager Platform
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
            Subscribe. Bet on the Future.
            <br />
            <span className="text-primary">Win Your Bill Back.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every plan includes an exclusive wager incentive. Pick a real-world condition — if it happens within 30 days, your subscription is on us.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="container max-w-5xl mx-auto py-16">
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
                  <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
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

                  {/* Wager Incentive */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap size={13} className="text-primary" fill="currentColor" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Wager Incentive</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {plan.rewardDescription}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a winning condition at checkout. If it happens in 30 days — you win.
                    </p>
                  </div>

                  <Button
                    className="w-full gap-2 font-semibold"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={createCheckout.isPending}
                  >
                    Get {plan.name} <ArrowRight size={16} />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Test card: 4242 4242 4242 4242
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-sm mb-3">Already subscribed?</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
