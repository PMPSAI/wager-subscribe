import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function MerchantWebhook() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [result, setResult] = useState<{ ok: boolean; body: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const { data: webhookEvents = [], refetch: refetchEvents } = trpc.merchant.getWebhookEvents.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, user]);

  const sendTestWebhook = async (eventType: string) => {
    setTesting(true);
    setResult(null);
    try {
      const payload = {
        id: "evt_test_" + Math.random().toString(36).slice(2),
        type: eventType,
        data: {
          object: {
            id: "sub_test_" + Math.random().toString(36).slice(2),
            customer: customerId || "cus_test_example",
            status: "active",
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
            metadata: { user_id: user?.id?.toString() ?? "1" },
          },
        },
      };
      const res = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": "test_sig" },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      setResult({ ok: res.ok, body });
      if (res.ok) {
        toast.success("Webhook delivered successfully");
        refetchEvents();
      } else toast.error("Webhook returned an error");
    } catch (e: any) {
      setResult({ ok: false, body: e.message });
      toast.error("Failed to send webhook");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !user) return null;

  const events = [
    { label: "customer.subscription.created", value: "customer.subscription.created" },
    { label: "customer.subscription.updated", value: "customer.subscription.updated" },
    { label: "customer.subscription.deleted", value: "customer.subscription.deleted" },
    { label: "checkout.session.completed", value: "checkout.session.completed" },
    { label: "invoice.paid", value: "invoice.paid" },
  ];

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Webhook Diagnostics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor recent Stripe webhook events and send test payloads</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Last 50 webhook events received (in-memory; resets on server restart).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No events yet. Send a test payload or wait for Stripe to deliver webhooks.
                  </TableCell>
                </TableRow>
              ) : (
                webhookEvents.map((ev) => (
                  <TableRow key={`${ev.id}-${ev.timestamp}`}>
                    <TableCell className="font-mono text-xs text-gray-500">{ev.id}</TableCell>
                    <TableCell className="font-mono text-xs">{ev.type}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{formatTimestamp(ev.timestamp)}</TableCell>
                    <TableCell>
                      {ev.signatureValid ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Invalid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ev.status === "processed" || ev.status === "test" ? "success" : ev.status === "invalid" ? "destructive" : "secondary"}>
                        {ev.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Send test events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Send Test Payload</h2>
          <div className="mb-4">
            <Label>Stripe Customer ID (optional)</Label>
            <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="cus_..." className="mt-1" />
          </div>
          <div className="space-y-2">
            {events.map(ev => (
              <button
                key={ev.value}
                disabled={testing}
                onClick={() => sendTestWebhook(ev.value)}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm font-mono text-gray-700 disabled:opacity-50"
              >
                {ev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Response</h2>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Webhook className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Send a test event to see the response</p>
            </div>
          ) : (
            <div>
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {result.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm font-medium">{result.ok ? "Success" : "Error"}</span>
              </div>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">
                {result.body}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Endpoint info */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Webhook Endpoint</h2>
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
          <code className="text-sm font-mono text-gray-700 flex-1">POST /api/stripe/webhook</code>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { navigator.clipboard.writeText(window.location.origin + "/api/stripe/webhook"); toast.success("Copied!"); }}>
            Copy URL
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Register this endpoint in your Stripe Dashboard → Developers → Webhooks. The handler verifies the <code className="bg-gray-100 px-1 rounded">stripe-signature</code> header using your <code className="bg-gray-100 px-1 rounded">STRIPE_WEBHOOK_SECRET</code>.
        </p>
      </div>
    </MerchantLayout>
  );
}
