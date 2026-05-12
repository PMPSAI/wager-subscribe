import { useState } from "react";
import { AdminLayout, AdminPageHeader } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Building2, Calendar, Zap } from "lucide-react";

export default function AdminPendingMerchants() {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.admin.overview.useQuery();
  const pendingMerchants = (overview?.merchants ?? []).filter((m: any) => m.onboardingStatus === "pending_review");

  const approveMutation = trpc.admin.approveMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant approved successfully"); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.admin.rejectMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant rejected"); setRejectDialogOpen(false); setRejectReason(""); setRejectTarget(null); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Pending Approval"
        subtitle="Review and action merchant applications"
        actions={
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {pendingMerchants.length} pending
          </Badge>
        }
      />

      <div className="p-8">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : pendingMerchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
            <p className="text-sm text-slate-400 mt-1">No merchant applications pending review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingMerchants.map((m: any) => (
              <Card key={m.id} className="border-amber-200 bg-amber-50/30 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">{m.name}</h3>
                          <Badge variant="secondary" className="text-xs font-mono">{m.slug}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Applied {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Stripe: {m.stripeMode ?? "test"} mode
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: "Stripe Key", ok: !!m.stripePublishableKey },
                            { label: "Webhook", ok: !!m.stripeWebhookSecret },
                            { label: "Price IDs", ok: !!(m.stripePlanPriceIds && Object.keys(m.stripePlanPriceIds ?? {}).length > 0) },
                            { label: "Live Mode", ok: m.stripeMode === "live" },
                          ].map((check) => (
                            <div key={check.label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${check.ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              {check.ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {check.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ merchantId: m.id })}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                        onClick={() => { setRejectTarget(m); setRejectDialogOpen(true); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Reject Merchant — {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason-pending">Reason for rejection <span className="text-red-500">*</span></Label>
            <Textarea
              id="reject-reason-pending"
              placeholder="Explain why this merchant application is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-slate-400">This reason will be stored for compliance records.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(""); setRejectTarget(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ merchantId: rejectTarget.id, reason: rejectReason })}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
