import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Copy, ExternalLink,
  AlertCircle, Save, Eye, EyeOff, Plus, Clock, Key, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function MerchantSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [merchantName, setMerchantName] = useState("");
  const [merchantSlug, setMerchantSlug] = useState("");
  const [stripeMode, setStripeMode] = useState<"test" | "live">("test");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [embedTokenTtl, setEmbedTokenTtl] = useState(86400);
  const [stripePriceStarter, setStripePriceStarter] = useState("");
  const [stripePricePro, setStripePricePro] = useState("");
  const [stripePriceElite, setStripePriceElite] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  const utils = trpc.useUtils();

  const { data: merchant, isLoading: merchantLoading, isError: merchantError } = trpc.merchant.get.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (merchant) {
      setMerchantName(merchant.name ?? "");
      setMerchantSlug(merchant.slug ?? "");
      setStripePublishableKey(merchant.stripePublishableKey ?? "");
      setStripeMode((merchant.stripeMode as "test" | "live") || "test");
      const ids = (merchant.stripePlanPriceIds as Record<string, string> | null) ?? {};
      setStripePriceStarter(ids.starter ?? "");
      setStripePricePro(ids.pro ?? "");
      setStripePriceElite(ids.elite ?? "");
    }
  }, [merchant]);

  const createMerchant = trpc.merchant.create.useMutation({
    onSuccess: () => { toast.success("Merchant account created!"); utils.merchant.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMerchant = trpc.merchant.update.useMutation({
    onSuccess: () => { toast.success("Settings saved!"); utils.merchant.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createEmbedToken = trpc.merchant.createEmbedToken.useMutation({
    onSuccess: (data) => {
      toast.success("Embed token generated!");
      navigator.clipboard.writeText(data.token);
      toast.info("Token copied to clipboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleSave = () => {
    if (!merchantName.trim() || !merchantSlug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    const payload = {
      name: merchantName,
      slug: merchantSlug,
      stripeMode,
      stripePublishableKey: stripePublishableKey || undefined,
      stripeAccessToken: stripeSecretKey || undefined,
      stripeWebhookSecret: stripeWebhookSecret || undefined,
      stripePlanPriceIds: {
        ...(stripePriceStarter && { starter: stripePriceStarter }),
        ...(stripePricePro && { pro: stripePricePro }),
        ...(stripePriceElite && { elite: stripePriceElite }),
      },
    };
    if (merchant) {
      updateMerchant.mutate({ id: merchant.id, ...payload });
    } else {
      createMerchant.mutate(payload);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://wager-subscribe.vercel.app";
  const successRedirectPattern = `${origin}/incentiv-select?session_id={CHECKOUT_SESSION_ID}`;
  const widgetUrl = `${origin}/widget`;
  const embedSnippet = `<!-- WagerSubscribe Widget -->
<script src="${origin}/embed.js"></script>
<div id="wager-subscribe-widget"></div>
<script>
  WagerSubscribe.init('#wager-subscribe-widget', {
    token: 'YOUR_EMBED_TOKEN'
  });
</script>`;
  const iframeSnippet = `<iframe
  src="${widgetUrl}?embed=1&token=YOUR_EMBED_TOKEN"
  width="100%" height="600"
  frameborder="0"
  style="border-radius:12px;border:1px solid #e5e7eb;"
></iframe>`;

  if (loading || !user) return null;

  return (
    <MerchantLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your merchant account, Stripe integration, and widget installation</p>
        </div>

        {/* Merchant Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-emerald-600" />
              </div>
              Merchant Account
            </CardTitle>
            <CardDescription>
              {merchant
                ? "Your merchant account is active."
                : merchantError
                  ? "We couldn't load your merchant account (try refreshing). You can create one below."
                  : "Complete your merchant account setup below. Fill in your business name and slug — this creates your merchant record for widget and Stripe."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {merchantLoading ? (
              <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Business Name</Label>
                    <Input value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="e.g. Acme Sports Betting" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Slug (URL identifier)</Label>
                    <Input
                      value={merchantSlug}
                      onChange={e => setMerchantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="e.g. acme-sports"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used in widget URLs: /widget/{merchantSlug || "your-slug"}</p>
                  </div>
                </div>
                {merchant && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Merchant ID: #{merchant.id}</p>
                      <p className="text-xs text-emerald-600">Account active</p>
                    </div>
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-xs">
                      {merchant.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Stripe Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <Key size={16} className="text-violet-600" />
              </div>
              Stripe Integration
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to process subscription payments and apply rewards as billing credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center justify-between p-4 border rounded-xl ${merchant?.stripeAccessToken ? "bg-emerald-50 border-emerald-200" : "bg-yellow-50 border-yellow-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${merchant?.stripeAccessToken ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                  S
                </div>
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {merchant?.stripeAccessToken ? "Stripe Connected" : "Stripe Not Configured"}
                    {merchant?.stripeAccessToken ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5 px-1.5 gap-1">
                        <CheckCircle2 size={10} /> Live Mode
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 text-[10px] h-5 px-1.5 gap-1">
                        <AlertCircle size={10} /> Not Connected
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {merchant?.stripeAccessToken ? "Payments enabled. Rewards applied as billing credits." : "Add your Stripe keys below to enable payments."}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open("https://dashboard.stripe.com/apikeys", "_blank")}>
                <ExternalLink size={14} /> Stripe Dashboard
              </Button>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setStripeMode("test")}
                className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${stripeMode === "test" ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
              >
                🧪 Test Mode
                <div className="text-xs font-normal mt-0.5 opacity-70">Sandbox / no real charges</div>
              </button>
              <button
                type="button"
                onClick={() => setStripeMode("live")}
                className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${stripeMode === "live" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
              >
                💳 Live Mode
                <div className="text-xs font-normal mt-0.5 opacity-70">Real payments</div>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Publishable Key (pk_live_... or pk_test_...)</Label>
                <Input value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} placeholder="pk_live_51..." className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Secret Key (sk_live_... or sk_test_...)</Label>
                <div className="relative">
                  <Input type={showSecretKey ? "text" : "password"} value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} placeholder="sk_live_51..." className="font-mono text-sm pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowSecretKey(!showSecretKey)}>
                    {showSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Webhook Signing Secret (whsec_...)</Label>
                <div className="relative">
                  <Input type={showWebhookSecret ? "text" : "password"} value={stripeWebhookSecret} onChange={e => setStripeWebhookSecret(e.target.value)} placeholder="whsec_..." className="font-mono text-sm pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowWebhookSecret(!showWebhookSecret)}>
                    {showWebhookSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Webhook Endpoint</p>
                <code className="font-mono text-xs bg-blue-100 rounded px-2 py-1 block mt-1">{origin}/api/stripe-webhook</code>
                <p className="text-xs mt-1 text-blue-600">Events to listen: <code>checkout.session.completed</code>, <code>customer.subscription.updated</code>, <code>invoice.payment_failed</code></p>
              </div>
            </div>

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSave} disabled={createMerchant.isPending || updateMerchant.isPending}>
              <Save size={14} />
              {createMerchant.isPending || updateMerchant.isPending ? "Saving..." : merchant ? "Save Settings" : "Create Merchant Account"}
            </Button>
          </CardContent>
        </Card>

        {/* Plan Price IDs - Widget Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">💳</span>
              </div>
              Plan Price IDs (Widget Checkout)
            </CardTitle>
            <CardDescription>
              Create recurring subscription prices in your Stripe Dashboard (Products → Add price) and paste the price IDs below. Required for checkout when users choose a plan from your embedded widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Starter (price_...)</Label>
                <Input value={stripePriceStarter} onChange={e => setStripePriceStarter(e.target.value)} placeholder="price_xxx" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Pro (price_...)</Label>
                <Input value={stripePricePro} onChange={e => setStripePricePro(e.target.value)} placeholder="price_xxx" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Elite (price_...)</Label>
                <Input value={stripePriceElite} onChange={e => setStripePriceElite(e.target.value)} placeholder="price_xxx" className="font-mono text-sm" />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSave} disabled={createMerchant.isPending || updateMerchant.isPending}>
              <Save size={14} />
              {createMerchant.isPending || updateMerchant.isPending ? "Saving..." : "Save Plan Prices"}
            </Button>
          </CardContent>
        </Card>

        {/* Widget Installation */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Installation</CardTitle>
            <CardDescription>Embed the WagerSubscribe widget on your site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Widget Preview</p>
                <p className="text-sm text-gray-500">Test the full subscription + prediction flow</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => window.open(widgetUrl, "_blank")}>
                <ExternalLink size={14} /> Open Widget
              </Button>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Generate Embed Token</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
                  <Clock size={14} className="text-gray-400" />
                  <select value={embedTokenTtl} onChange={e => setEmbedTokenTtl(Number(e.target.value))} className="text-sm bg-transparent outline-none">
                    <option value={3600}>1 hour</option>
                    <option value={86400}>24 hours</option>
                    <option value={604800}>7 days</option>
                    <option value={2592000}>30 days</option>
                  </select>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={!merchant || createEmbedToken.isPending} onClick={() => merchant && createEmbedToken.mutate({ merchantId: merchant.id, ttlSeconds: embedTokenTtl })}>
                  <Plus size={14} />
                  {createEmbedToken.isPending ? "Generating..." : "Generate Token"}
                </Button>
              </div>
              {!merchant && <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> Create your merchant account first</p>}
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Stripe Checkout Success URL</Label>
              <div className="flex gap-2">
                <Input readOnly className="font-mono text-xs bg-muted" value={successRedirectPattern} />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(successRedirectPattern, "Redirect URL")}><Copy size={14} /></Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">iFrame Embed</Label>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{iframeSnippet}</pre>
                <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-gray-800 hover:bg-gray-700 text-gray-300 border-none" onClick={() => copyToClipboard(iframeSnippet, "iFrame snippet")}><Copy size={12} /></Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Script Embed</Label>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{embedSnippet}</pre>
                <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-gray-800 hover:bg-gray-700 text-gray-300 border-none" onClick={() => copyToClipboard(embedSnippet, "Embed snippet")}><Copy size={12} /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
