import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function MerchantResolver() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: lastRun, isLoading } = trpc.resolver.lastRun.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const runMutation = trpc.resolver.runWeekly.useMutation({
    onSuccess: (data) => {
      toast.success(`Resolution complete: ${data.wins} wins, ${data.losses} losses`);
      utils.resolver.lastRun.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  return (
    <MerchantLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Resolver</h1>
          <p className="text-sm text-gray-500 mt-0.5">Run the weekly resolution job to process due intents</p>
        </div>
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Zap className="w-4 h-4" />
          {runMutation.isPending ? "Running..." : "Run Resolution Job"}
        </Button>
      </div>

      {/* Last Run Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Last Run</h2>
        {isLoading ? (
          <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ) : !lastRun ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No resolver runs yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-1.5">
                {lastRun.status === "completed" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : lastRun.status === "failed" ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertCircle className="w-4 h-4 text-yellow-500" />}
                <span className="font-semibold text-gray-900 capitalize">{lastRun.status}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Processed</p>
              <p className="font-semibold text-gray-900">{lastRun.intentsProcessed ?? 0} intents</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Wins / Losses</p>
              <p className="font-semibold text-gray-900">
                <span className="text-emerald-600">{lastRun.winsFound ?? 0}W</span>
                {" / "}
                <span className="text-red-500">{lastRun.lossesFound ?? 0}L</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Completed At</p>
              <p className="font-semibold text-gray-900 text-xs">
                {lastRun.completedAt ? new Date(lastRun.completedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        )}
        {lastRun?.errorMessage && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Errors</p>
            <p className="text-xs text-red-600 font-mono">{lastRun.errorMessage}</p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">How the Resolver Works</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span><span>Fetches all intents with <code className="bg-gray-100 px-1 rounded text-xs">TRACKING</code> or <code className="bg-gray-100 px-1 rounded text-xs">PENDING_RESOLUTION</code> status whose <code className="bg-gray-100 px-1 rounded text-xs">resolveAt</code> date has passed.</span></li>
          <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span><span>For each intent, checks the outcome against the configured data source (currently simulated; connect a live market/sports feed in production).</span></li>
          <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span><span>WIN: creates a settlement record with <code className="bg-gray-100 px-1 rounded text-xs">WIN_PENDING_ELIGIBILITY</code> status and notifies the customer to claim their reward.</span></li>
          <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span><span>LOSS: appends a ledger entry and marks the intent <code className="bg-gray-100 px-1 rounded text-xs">RESOLVED_LOSS</code>. Subscription continues at the standard rate.</span></li>
          <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">5</span><span>Logs a resolver run record with counts and any errors for audit purposes.</span></li>
        </ol>
      </div>
    </MerchantLayout>
  );
}
