import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Target, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  TRACKING: "bg-blue-100 text-blue-700",
  PENDING_RESOLUTION: "bg-yellow-100 text-yellow-700",
  RESOLVED_WIN: "bg-emerald-100 text-emerald-700",
  RESOLVED_LOSS: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  CREATED: "bg-gray-100 text-gray-600",
  ERROR: "bg-red-100 text-red-600",
};

export default function MerchantIntents() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [resolveTarget, setResolveTarget] = useState<number | null>(null);
  const [proofNote, setProofNote] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: intents, isLoading } = trpc.intent.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const resolveMutation = trpc.intent.resolve.useMutation({
    onSuccess: () => { toast.success("Intent resolved"); setResolveTarget(null); utils.intent.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  const selectedIntent = intents?.find(i => i.id === resolveTarget);

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Intents</h1>
        <p className="text-sm text-gray-500 mt-0.5">All customer incentive intents and their tracking status</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !intents?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No intents yet</p>
          <p className="text-sm text-gray-400 mt-1">Intents are created when customers select a condition after subscribing</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "User", "Status", "Resolve At", "Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {intents.map(intent => (
                <tr key={intent.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">#{intent.id}</td>
                  <td className="px-5 py-3.5 text-gray-700">User #{intent.userId}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[intent.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {intent.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {intent.resolveAt ? new Date(intent.resolveAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {(intent.status === "TRACKING" || intent.status === "PENDING_RESOLUTION") && (
                      <Button size="sm" variant="outline" onClick={() => setResolveTarget(intent.id)} className="text-xs h-7">
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveTarget !== null} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resolve Intent #{resolveTarget}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Proof / Notes (optional)</Label><Textarea value={proofNote} onChange={e => setProofNote(e.target.value)} rows={3} placeholder="Data source, evidence, or notes..." /></div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={resolveMutation.isPending}
                onClick={() => resolveTarget && resolveMutation.mutate({ intentId: resolveTarget, outcome: "WIN", proofNote })}
              >
                <CheckCircle className="w-4 h-4" /> WIN
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                disabled={resolveMutation.isPending}
                onClick={() => resolveTarget && resolveMutation.mutate({ intentId: resolveTarget, outcome: "LOSS", proofNote })}
              >
                <XCircle className="w-4 h-4" /> LOSS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
}
