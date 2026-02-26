import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Trophy,
  TrendingUp,
  BarChart3,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";

const STEPS = [
  {
    number: "01",
    title: "Choose a Plan",
    description: "Pick Starter, Pro, or Elite — each comes with a wager incentive worth far more than your subscription.",
    icon: <Zap size={20} className="text-primary" />,
  },
  {
    number: "02",
    title: "Pay via Stripe",
    description: "Secure checkout powered by Stripe. Your payment is processed instantly and your subscription activates immediately.",
    icon: <Shield size={20} className="text-primary" />,
  },
  {
    number: "03",
    title: "Select Your Wager",
    description: "Choose a real-world condition from Market, Sports, or Economy categories. If it happens in 30 days, you win.",
    icon: <TrendingUp size={20} className="text-primary" />,
  },
  {
    number: "04",
    title: "Track & Win",
    description: "Your dashboard tracks every wager tied to your transaction ID. Come back anytime to check results.",
    icon: <Trophy size={20} className="text-primary" />,
  },
];

const FEATURES = [
  { icon: <TrendingUp size={18} className="text-blue-500" />, label: "Market Conditions", desc: "Bitcoin, S&P 500, Gold, and more" },
  { icon: <Trophy size={18} className="text-yellow-500" />, label: "Sports Outcomes", desc: "NBA, NFL, and major tournaments" },
  { icon: <BarChart3 size={18} className="text-green-500" />, label: "Economic Events", desc: "Fed rates, inflation, oil prices" },
  { icon: <RefreshCw size={18} className="text-purple-500" />, label: "Custom Wagers", desc: "Elite plan: define your own condition" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-foreground text-lg" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              WagerSubscribe
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plans")}>
              Plans
            </Button>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                Dashboard <ArrowRight size={14} />
              </Button>
            ) : (
              <Button size="sm" onClick={() => (window.location.href = getLoginUrl())} className="gap-1.5">
                Sign In <ArrowRight size={14} />
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none" />
        <div className="container max-w-5xl mx-auto py-24 px-4 text-center relative">
          <Badge variant="outline" className="mb-6 bg-primary/5 text-primary border-primary/20 px-4 py-1.5 text-sm font-semibold">
            <Zap size={12} className="mr-1.5" fill="currentColor" />
            Subscription + Wager Platform
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
            Subscribe to a Plan.
            <br />
            <span className="text-primary">Bet on the World.</span>
            <br />
            Win Your Bill Back.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Every WagerSubscribe plan includes a real-money incentive. Pick a condition — Bitcoin hitting $100k, your team winning the championship, or a Fed rate cut — and if it happens in 30 days, your subscription is free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 px-8 text-base font-bold" onClick={() => navigate("/plans")}>
              View Plans <ArrowRight size={18} />
            </Button>
            {isAuthenticated && (
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base" onClick={() => navigate("/dashboard")}>
                My Dashboard
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Test with card <code className="bg-muted px-1.5 py-0.5 rounded text-xs">4242 4242 4242 4242</code>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps from subscription to winning your bill back.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-card border border-border rounded-2xl p-6">
                <div className="text-4xl font-black text-primary/10 mb-3">{step.number}</div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  {step.icon}
                </div>
                <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wager categories */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Real Conditions. Real Rewards.</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Wager conditions are drawn from live market data, sports outcomes, and economic events. Every wager is tracked against your transaction ID and user account — accessible anytime from your dashboard.
              </p>
              <ul className="space-y-3">
                {[
                  "Wagers tied to your Stripe transaction ID",
                  "Persistent dashboard — check results anytime",
                  "30-day tracking window per subscription cycle",
                  "Automatic reward application on win",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 gap-2" onClick={() => navigate("/plans")}>
                Get Started <ArrowRight size={16} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
                    {f.icon}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-1">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary py-16">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to place your first wager?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Subscribe today and choose your winning condition. The next 30 days could be on us.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 px-10 text-base font-bold"
            onClick={() => navigate("/plans")}
          >
            View All Plans <ArrowRight size={18} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap size={12} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-semibold text-foreground">WagerSubscribe</span>
          </div>
          <p>Payments secured by Stripe. Test mode active.</p>
        </div>
      </footer>
    </div>
  );
}
