import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  WIN_PENDING_ELIGIBILITY: "bg-yellow-100 text-yellow-700",
  APPLIED: "bg-emerald-100 text-emerald-700",
  EXPIRED_UNCLAIMED: "bg-gray-100 text-gray-500",
  FAILED_NEEDS_REVIEW: "bg-red-100 text-red-700",
};

export default function MerchantSettlements() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: settlements, isLoading } = trpc.settlement.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const applyMutation = trpc.settlement.applySettlement.useMutation({
    onSuccess: () => { toast.success("Settlement applied"); utils.settlement.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track reward settlements and their application status</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !settlements?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No settlements yet</p>
          <p className="text-sm text-gray-400 mt-1">Settlements are created when intents are resolved as wins</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "Intent", "User", "Reward (USD)", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settlements.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">#{s.id}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">#{s.intentId}</td>
                  <td className="px-5 py-3.5 text-gray-700">User #{s.userId}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">${parseFloat(s.rewardValueUsd ?? "0").toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.status === "WIN_PENDING_ELIGIBILITY" && (
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        disabled={applyMutation.isPending}
                        onClick={() => applyMutation.mutate({ settlementId: s.id })}
                      >
                        Apply
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MerchantLayout>
  );
}
