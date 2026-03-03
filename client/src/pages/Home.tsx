import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ArrowRight, CheckCircle2, Trophy, TrendingUp, BarChart3, Shield, RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";

const STEPS = [
  {
    number: "01",
    title: "Choose a Plan",
    description: "Pick Starter, Pro, or Elite — each includes a performance incentive worth far more than your monthly subscription fee.",
    icon: <Zap size={20} className="text-primary" />,
  },
  {
    number: "02",
    title: "Complete Payment",
    description: "Secure checkout powered by Stripe. Your subscription activates immediately upon payment confirmation.",
    icon: <Shield size={20} className="text-primary" />,
  },
  {
    number: "03",
    title: "Select Your Condition",
    description: "Choose a real-world market, sports, or economic condition. If it occurs within 30 days, you earn a subscription credit reward.",
    icon: <TrendingUp size={20} className="text-primary" />,
  },
  {
    number: "04",
    title: "Track & Earn",
    description: "Your dashboard tracks every incentive tied to your transaction ID. Return anytime to check outcomes and claim credits.",
    icon: <Trophy size={20} className="text-primary" />,
  },
];

const FEATURES = [
  { icon: <TrendingUp size={18} className="text-blue-500" />, label: "Market Conditions", desc: "Bitcoin, S&P 500, Gold, and more" },
  { icon: <Trophy size={18} className="text-yellow-500" />, label: "Sports Outcomes", desc: "NBA, NFL, and major tournaments" },
  { icon: <BarChart3 size={18} className="text-green-500" />, label: "Economic Events", desc: "Fed rates, inflation, oil prices" },
  { icon: <RefreshCw size={18} className="text-purple-500" />, label: "Custom Conditions", desc: "Elite plan: define your own condition" },
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
            <span className="font-bold text-foreground text-lg">IncentivPay</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plans")}>Plans</Button>
            {isAuthenticated ? (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  Dashboard
                </Button>
                {/* Admin-only Merchant Portal link */}
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  View Dashboard
                </Button>
                <Button size="sm" onClick={() => (window.location.href = getLoginUrl())} className="gap-1.5">
                  Sign In <ArrowRight size={14} />
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/dev-login", { method: "GET", credentials: "include", redirect: "manual" });
                        if (r.type === "opaqueredirect" || r.status === 0 || r.status === 302) {
                          window.location.href = "/";
                          return;
                        }
                        if (!r.ok) throw new Error(String(r.status));
                        window.location.href = "/";
                      } catch {
                        window.location.href = `${window.location.origin}/api/dev-login`;
                      }
                    }}
                  >
                    Dev login (no DB)
                  </Button>
                )}
              </>
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
            Subscription + Performance Incentive Platform
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
            Subscribe to a Plan.
            <br />
            <span className="text-primary">Track a Condition.</span>
            <br />
            Earn Subscription Credits.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Every IncentivPay plan includes a performance incentive. Select a real-world condition — Bitcoin reaching $100k, a Fed rate cut, or a championship outcome — and if it occurs within 30 days, your subscription fee is credited back to your account.
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
              Four steps from subscription to earning your performance reward credit.
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

      {/* Condition categories */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Real Conditions. Real Subscription Credits.</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Incentive conditions are drawn from live market data, sports outcomes, and economic events. Every incentive is tracked against your transaction ID and member account — accessible anytime from your personal dashboard.
              </p>
              <ul className="space-y-3">
                {[
                  "Incentives tied to your Stripe transaction ID",
                  "Persistent dashboard — check outcomes anytime",
                  "30-day tracking window per subscription cycle",
                  "Automatic subscription credit on condition achievement",
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
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to activate your first incentive?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Subscribe today and select your performance condition. If the condition is achieved within 30 days, your subscription fee is credited back to your account.
          </p>
          <Button size="lg" variant="secondary" className="gap-2 px-10 text-base font-bold" onClick={() => navigate("/plans")}>
            View All Plans <ArrowRight size={18} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Zap size={12} className="text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-semibold text-foreground">IncentivPay</span>
            </div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/plans")} className="hover:text-foreground transition-colors">Plans</button>
              <button onClick={() => navigate("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            </nav>
          </div>
          <div className="border-t border-border pt-6 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>Important Disclosure:</strong> IncentivPay is a subscription-based performance incentive platform. Rewards are issued exclusively as subscription credits applied to future billing cycles. IncentivPay is <strong>not</strong> a financial product, investment vehicle, gambling service, or money-services business. No cash, prizes, or monetary transfers are made to subscribers. Subscription credits have no cash value and are non-transferable.
            </p>
            <p>
              Performance conditions are tracked against publicly available data sources. Condition outcomes are determined by IncentivPay's resolver process and are final. Past condition outcomes are not indicative of future results. Subscription credits are subject to the IncentivPay Terms of Service.
            </p>
            <p>© {new Date().getFullYear()} IncentivPay. Payments secured by Stripe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
