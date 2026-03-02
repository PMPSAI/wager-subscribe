import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export default function MerchantSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const successRedirectPattern = typeof window !== "undefined" ? `${window.location.origin}/incentiv-select?session_id={CHECKOUT_SESSION_ID}` : "";
  const embedSnippet = `<script src="${typeof window !== "undefined" ? window.location.origin : "https://yoursite.com"}/embed.js"></script>
<div id="incentiv-dashboard" data-token="YOUR_EMBED_TOKEN"></div>
<script>
  IncentivSubscribe.init('#incentiv-dashboard');
</script>`;

  if (loading || !user) return null;

  return (
    <MerchantLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage integrations, installation, and branding</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Integration</CardTitle>
            <CardDescription>Stripe is used for checkout and subscription billing. Billing deferrals are applied via the settlement engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                  S
                </div>
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    Connected
                    <Badge variant="success" className="gap-1 text-[10px] h-5 px-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Live Mode
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">Configure STRIPE_SECRET_KEY in .env</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <RefreshCcw className="w-4 h-4" />
                Reconnect
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation Snippet</CardTitle>
            <CardDescription>Embed the customer dashboard and set Stripe Checkout success redirect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Success Redirect URL (Stripe Checkout)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono"
                  value={successRedirectPattern}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(successRedirectPattern, "Redirect URL")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Use this as success_url when creating Stripe Checkout sessions.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Embed Snippet (Customer Dashboard)
              </label>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto font-mono">
                  {embedSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-gray-800 hover:bg-gray-700 text-gray-300 border-none"
                  onClick={() => copyToClipboard(embedSnippet, "Embed snippet")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Place on your subscription site to show the incentive dashboard. Replace YOUR_EMBED_TOKEN with a signed token.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Customize the appearance of the customer dashboard (UI only; persistence can be added later).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <div className="w-10 h-10 rounded-md bg-emerald-600 border shadow-sm" />
                  <input
                    type="text"
                    readOnly
                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    value="#059669"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Logo URL</label>
                <input
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://yoursite.com/logo.png"
                  readOnly
                />
              </div>
            </div>
            <Button disabled>Save Branding (coming soon)</Button>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
