import { useState } from "react";
import { AdminLayout, AdminPageHeader, OnboardingStatusBadge } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, ShieldCheck, MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function ComplianceBar({ score, total = 5 }: { score: number; total?: number }) {
  const pct = Math.round((score / total) * 100);
  const color = score === total ? "bg-emerald-500" : score >= 3 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${score === total ? "text-emerald-600" : score >= 3 ? "text-amber-600" : "text-red-600"}`}>
        {score}/{total}
      </span>
    </div>
  );
}

export default function AdminCompliance() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; merchant: any }>({ open: false, merchant: null });
  const [noteText, setNoteText] = useState("");

  const utils = trpc.useUtils();
  const { data: complianceData, isLoading } = trpc.admin.getComplianceSummary.useQuery();

  const addNoteMutation = trpc.admin.addComplianceNote.useMutation({
    onSuccess: () => {
      toast.success("Compliance note added");
      setNoteDialog({ open: false, merchant: null });
      setNoteText("");
      utils.admin.getComplianceSummary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (complianceData ?? []).filter((m: any) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = filtered.length > 0
    ? (filtered.reduce((sum: number, m: any) => sum + m.complianceScore, 0) / filtered.length).toFixed(1)
    : "—";
  const fullCompliance = filtered.filter((m: any) => m.complianceScore === 5).length;

  return (
    <AdminLayout>
      <AdminPageHeader title="Compliance" subtitle="Per-merchant compliance checklist and notes" />

      <div className="p-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Compliance Score</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{avgScore}<span className="text-sm font-normal text-slate-400">/5</span></p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fully Compliant</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{fullCompliance}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Needs Attention</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{filtered.filter((m: any) => m.complianceScore < 3).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Compliance Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Score</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Key</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Webhook</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prices</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Live</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No merchants found</p>
                    </td>
                  </tr>
                ) : filtered.map((m: any) => {
                  const checks = m.complianceChecks;
                  const isExpanded = expandedId === m.id;
                  return (
                    <>
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.slug}</p>
                        </td>
                        <td className="px-4 py-3">
                          <OnboardingStatusBadge status={m.onboardingStatus ?? "pending_review"} />
                        </td>
                        <td className="px-4 py-3 w-40">
                          <ComplianceBar score={m.complianceScore} />
                        </td>
                        {[checks.stripeKeySet, checks.webhookSet, checks.priceIdsSet, checks.isLiveMode, checks.isApproved].map((ok, i) => (
                          <td key={i} className="px-2 py-3 text-center">
                            {ok ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-200 mx-auto" />}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600 hover:text-violet-700"
                              onClick={() => { setNoteDialog({ open: true, merchant: m }); }}>
                              <MessageSquarePlus className="w-3.5 h-3.5" /> Note
                            </Button>
                            {m.complianceNotes && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400"
                                onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && m.complianceNotes && (
                        <tr key={`${m.id}-notes`} className="bg-amber-50">
                          <td colSpan={9} className="px-4 py-3">
                            <p className="text-xs font-semibold text-amber-700 mb-1">Compliance Notes</p>
                            <p className="text-xs text-amber-600 whitespace-pre-wrap">{m.complianceNotes}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={() => { setNoteDialog({ open: false, merchant: null }); setNoteText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Compliance Note — {noteDialog.merchant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {noteDialog.merchant?.complianceNotes && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {noteDialog.merchant.complianceNotes}
              </div>
            )}
            <Label htmlFor="note-text">New Note <span className="text-red-500">*</span></Label>
            <Textarea
              id="note-text"
              placeholder="Add a compliance note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-slate-400">Notes are timestamped and appended to existing notes.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteDialog({ open: false, merchant: null }); setNoteText(""); }}>Cancel</Button>
            <Button
              disabled={!noteText.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate({ merchantId: noteDialog.merchant.id, note: noteText })}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
