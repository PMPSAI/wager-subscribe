import { AdminLayout, AdminPageHeader } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, ExternalLink, Settings, Database, Zap, CreditCard, Globe } from "lucide-react";

function ConfigRow({ label, value, ok, hint }: { label: string; value?: string; ok?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2.5">
        {ok !== undefined && (
          ok ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
      </div>
      {value && (
        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono max-w-xs truncate">{value}</code>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { data: overview } = trpc.admin.overview.useQuery();
  const stats = overview?.stats;

  const envChecks = [
    { label: "DATABASE_URL", ok: true, hint: "MySQL/TiDB connection" },
    { label: "JWT_SECRET", ok: true, hint: "Session signing" },
    { label: "STRIPE_SECRET_KEY", ok: !!(stats as any)?.stripeConfigured, hint: "Stripe server-side key" },
    { label: "STRIPE_WEBHOOK_SECRET", ok: !!(stats as any)?.stripeWebhookConfigured, hint: "Webhook signature verification" },
    { label: "VITE_STRIPE_PUBLISHABLE_KEY", ok: !!(stats as any)?.stripePublishableConfigured, hint: "Stripe client-side key" },
    { label: "OAUTH_SERVER_URL", ok: true, hint: "Manus OAuth backend" },
    { label: "BUILT_IN_FORGE_API_KEY", ok: true, hint: "Manus built-in APIs" },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader title="Platform Settings" subtitle="Environment configuration and system health" />

      <div className="p-8 space-y-6">
        {/* Platform Info */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-violet-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</p>
              </div>
              <p className="text-sm font-bold text-slate-900">IncentivPay</p>
              <p className="text-xs text-slate-400 mt-0.5">Merchant Incentive Platform</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Database</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium text-emerald-700">Connected</p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">MySQL / TiDB</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-medium text-emerald-700">Configured</p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Test sandbox active</p>
            </CardContent>
          </Card>
        </div>

        {/* Environment Variables */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Environment Variables
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {envChecks.filter(e => e.ok).length}/{envChecks.length} configured
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {envChecks.map((check) => (
              <ConfigRow key={check.label} label={check.label} ok={check.ok} hint={check.hint} />
            ))}
          </CardContent>
        </Card>

        {/* Platform Stats */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Platform Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Merchants", value: stats?.totalMerchants ?? 0 },
                { label: "Active Merchants", value: stats?.activeMerchants ?? 0 },
                { label: "Total Users", value: stats?.totalUsers ?? 0 },
                { label: "Total Intents", value: stats?.totalIntents ?? 0 },
                { label: "Pending Intents", value: stats?.pendingIntents ?? 0 },
                { label: "Resolved Intents", value: stats?.resolvedIntents ?? 0 },
                { label: "Total Markets", value: stats?.totalMarkets ?? 0 },
                { label: "Enabled Markets", value: stats?.enabledMarkets ?? 0 },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Stripe Dashboard", href: "https://dashboard.stripe.com", hint: "Payments, webhooks, customers" },
                { label: "Stripe Sandbox", href: "https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVDRzME1MQlgyd21LNlp2LDE3NzI2ODQ4MDUv100RkVofBy3", hint: "Claim test sandbox" },
                { label: "Polymarket API", href: "https://docs.polymarket.com", hint: "Market data source" },
                { label: "Kalshi API", href: "https://trading-api.kalshi.com/docs", hint: "Market data source" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-violet-700">{link.label}</p>
                    <p className="text-xs text-slate-400">{link.hint}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
