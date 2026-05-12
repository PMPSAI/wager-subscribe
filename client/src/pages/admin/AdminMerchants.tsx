import { useState } from "react";
import { AdminLayout, AdminPageHeader, OnboardingStatusBadge } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Building2, CheckCircle, XCircle, PauseCircle, RefreshCw, Eye, ChevronRight } from "lucide-react";

type StatusFilter = "all" | "pending_review" | "approved" | "rejected" | "suspended";

export default function AdminMerchants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionTarget, setActionTarget] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.admin.overview.useQuery();
  const merchants = overview?.merchants ?? [];

  const approveMutation = trpc.admin.approveMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant approved"); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.admin.rejectMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant rejected"); setRejectDialogOpen(false); setRejectReason(""); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const suspendMutation = trpc.admin.suspendMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant suspended"); setSuspendDialogOpen(false); setSuspendReason(""); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const reactivateMutation = trpc.admin.reactivateMerchant.useMutation({
    onSuccess: () => { toast.success("Merchant reactivated"); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = merchants.filter((m: any) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.onboardingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: merchants.length,
    pending_review: merchants.filter((m: any) => m.onboardingStatus === "pending_review").length,
    approved: merchants.filter((m: any) => m.onboardingStatus === "approved").length,
    rejected: merchants.filter((m: any) => m.onboardingStatus === "rejected").length,
    suspended: merchants.filter((m: any) => m.onboardingStatus === "suspended").length,
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending_review", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "suspended", label: "Suspended" },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader title="Merchants" subtitle="Manage all merchant accounts and onboarding status" />

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${statusFilter === tab.key ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"}`}>
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No merchants found</p>
                    </td>
                  </tr>
                ) : filtered.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <OnboardingStatusBadge status={m.onboardingStatus ?? "pending_review"} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.stripeMode === "live" ? "default" : "secondary"} className="text-xs">
                        {m.stripeMode ?? "test"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600"
                          onClick={() => setSelectedMerchant(m)}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {(m.onboardingStatus === "pending_review" || m.onboardingStatus === "rejected") && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600"
                            onClick={() => approveMutation.mutate({ merchantId: m.id })}
                            disabled={approveMutation.isPending}
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {m.onboardingStatus === "pending_review" && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            onClick={() => { setActionTarget(m); setRejectDialogOpen(true); }}
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {m.onboardingStatus === "approved" && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                            onClick={() => { setActionTarget(m); setSuspendDialogOpen(true); }}
                            title="Suspend"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {m.onboardingStatus === "suspended" && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600"
                            onClick={() => reactivateMutation.mutate({ merchantId: m.id })}
                            disabled={reactivateMutation.isPending}
                            title="Reactivate"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Merchant Detail Dialog */}
      {selectedMerchant && (
        <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-600" />
                {selectedMerchant.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Status</p>
                  <OnboardingStatusBadge status={selectedMerchant.onboardingStatus ?? "pending_review"} />
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Stripe Mode</p>
                  <Badge variant={selectedMerchant.stripeMode === "live" ? "default" : "secondary"} className="text-xs">
                    {selectedMerchant.stripeMode ?? "test"}
                  </Badge>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Slug</p>
                  <p className="font-mono text-xs text-slate-700">{selectedMerchant.slug}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Created</p>
                  <p className="text-slate-700">{new Date(selectedMerchant.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedMerchant.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-xs text-red-600">{selectedMerchant.rejectionReason}</p>
                </div>
              )}
              {selectedMerchant.complianceNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Compliance Notes</p>
                  <p className="text-xs text-amber-600 whitespace-pre-wrap">{selectedMerchant.complianceNotes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {selectedMerchant.stripePublishableKey ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span className="text-slate-600">Stripe Key Set</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedMerchant.stripeWebhookSecret ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span className="text-slate-600">Webhook Set</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedMerchant.stripePlanPriceIds && Object.keys(selectedMerchant.stripePlanPriceIds ?? {}).length > 0 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span className="text-slate-600">Price IDs Set</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedMerchant.stripeMode === "live" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span className="text-slate-600">Live Mode</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {(selectedMerchant.onboardingStatus === "pending_review" || selectedMerchant.onboardingStatus === "rejected") && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => { approveMutation.mutate({ merchantId: selectedMerchant.id }); setSelectedMerchant(null); }}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
              )}
              {selectedMerchant.onboardingStatus === "pending_review" && (
                <Button
                  size="sm" variant="destructive"
                  onClick={() => { setActionTarget(selectedMerchant); setSelectedMerchant(null); setRejectDialogOpen(true); }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setSelectedMerchant(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Reject Merchant — {actionTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">Reason for rejection <span className="text-red-500">*</span></Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this merchant application is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ merchantId: actionTarget.id, reason: rejectReason })}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-700">Suspend Merchant — {actionTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendDialogOpen(false); setSuspendReason(""); }}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={suspendMutation.isPending}
              onClick={() => suspendMutation.mutate({ merchantId: actionTarget.id, reason: suspendReason || undefined })}
            >
              Suspend Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
