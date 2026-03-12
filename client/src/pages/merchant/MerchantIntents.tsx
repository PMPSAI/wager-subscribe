import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target, CheckCircle, XCircle, Clock, Trophy, TrendingUp,
  Filter, Search, RefreshCw, Zap, AlertCircle, DollarSign
} from "lucide-react";
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

const statusIcons: Record<string, React.ReactNode> = {
  TRACKING: <Clock size={12} />,
  PENDING_RESOLUTION: <AlertCircle size={12} />,
  RESOLVED_WIN: <CheckCircle size={12} />,
  RESOLVED_LOSS: <XCircle size={12} />,
  CANCELLED: <XCircle size={12} />,
};

export default function MerchantIntents() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [resolveTarget, setResolveTarget] = useState<number | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [resolveOutcome, setResolveOutcome] = useState<"WIN" | "LOSS">("WIN");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  const utils = trpc.useUtils();
  const { data: intents, isLoading, refetch } = trpc.intent.list.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 30000,
  });

  const resolveMutation = trpc.intent.resolve.useMutation({
    onSuccess: () => {
      toast.success(`Intent resolved as ${resolveOutcome === "WIN" ? "WIN 🏆" : "LOSS"}`);
      setResolveTarget(null);
      setProofNote("");
      utils.intent.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  const selectedIntent = intents?.find(i => i.id === resolveTarget);

  const filteredIntents = intents?.filter(intent => {
    const matchesStatus = filterStatus === "all" || intent.status === filterStatus;
    const terms = intent.termsSnapshot as any;
    const matchesSearch = !searchQuery ||
      `${intent.id}`.includes(searchQuery) ||
      (terms?.conditionLabel ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${intent.userId}`.includes(searchQuery);
    return matchesStatus && matchesSearch;
  }) ?? [];

  const stats = {
    total: intents?.length ?? 0,
    tracking: intents?.filter(i => i.status === "TRACKING").length ?? 0,
    pending: intents?.filter(i => i.status === "PENDING_RESOLUTION").length ?? 0,
    wins: intents?.filter(i => i.status === "RESOLVED_WIN").length ?? 0,
    losses: intents?.filter(i => i.status === "RESOLVED_LOSS").length ?? 0,
  };

  return (
    <MerchantLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prediction Intents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and resolve customer prediction intents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => navigate("/merchant/resolver")}>
            <Zap size={14} /> Auto Resolver
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: Target, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Tracking", value: stats.tracking, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending", value: stats.pending, icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Wins", value: stats.wins, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Losses", value: stats.losses, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by ID, condition, user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-400" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="TRACKING">Tracking</SelectItem>
              <SelectItem value="PENDING_RESOLUTION">Pending Resolution</SelectItem>
              <SelectItem value="RESOLVED_WIN">Resolved Win</SelectItem>
              <SelectItem value="RESOLVED_LOSS">Resolved Loss</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-gray-400">{filteredIntents.length} results</span>
      </div>

      {/* Intents Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !filteredIntents.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No intents found</p>
          <p className="text-sm text-gray-400 mt-1">
            {filterStatus !== "all" || searchQuery ? "Try adjusting your filters" : "Intents are created when customers select a condition after subscribing"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "User", "Condition", "Reward", "Status", "Resolve At", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIntents.map(intent => {
                const terms = intent.termsSnapshot as any;
                const canResolve = intent.status === "TRACKING" || intent.status === "PENDING_RESOLUTION";
                const rewardUsd = terms?.rewardValueUsd ?? (terms?.rewardValueCents ? (terms.rewardValueCents / 100).toFixed(2) : null);
                return (
                  <tr key={intent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">#{intent.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                        {intent.userId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="font-medium text-gray-800 truncate text-xs">{terms?.conditionLabel ?? "—"}</p>
                      {terms?.conditionCategory && (
                        <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{terms.conditionCategory}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {rewardUsd ? (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <DollarSign size={12} />
                          <span className="text-xs font-semibold">{rewardUsd}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[intent.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {statusIcons[intent.status]}
                        {intent.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {intent.resolveAt ? new Date(intent.resolveAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {canResolve ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => { setResolveTarget(intent.id); setResolveOutcome("WIN"); setProofNote(""); }}
                        >
                          <Zap size={12} /> Resolve
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveTarget !== null} onOpenChange={(open) => { if (!open) setResolveTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap size={18} className="text-emerald-600" /> Resolve Prediction Intent #{resolveTarget}
            </DialogTitle>
            <DialogDescription>
              Set the outcome for this prediction. This will trigger reward processing if WIN.
            </DialogDescription>
          </DialogHeader>
          {selectedIntent && (
            <div className="space-y-4 mt-2">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Condition</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {(selectedIntent.termsSnapshot as any)?.conditionLabel ?? `Intent #${selectedIntent.id}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">User #{selectedIntent.userId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Outcome</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      resolveOutcome === "WIN"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                    onClick={() => setResolveOutcome("WIN")}
                  >
                    <Trophy size={16} className={resolveOutcome === "WIN" ? "text-emerald-600" : "text-gray-400"} />
                    WIN
                  </button>
                  <button
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      resolveOutcome === "LOSS"
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                    onClick={() => setResolveOutcome("LOSS")}
                  >
                    <XCircle size={16} className={resolveOutcome === "LOSS" ? "text-red-500" : "text-gray-400"} />
                    LOSS
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Proof / Resolution Notes</Label>
                <Textarea
                  value={proofNote}
                  onChange={e => setProofNote(e.target.value)}
                  placeholder="e.g. BTC closed at $105,000 on 2025-03-15 per CoinGecko..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              {resolveOutcome === "WIN" && (
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
                  <Trophy size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Reward will be applied</p>
                    <p className="text-xs text-emerald-600">Credit added to customer account automatically</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setResolveTarget(null)}>Cancel</Button>
                <Button
                  className={`flex-1 gap-2 ${resolveOutcome === "WIN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"} text-white`}
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({
                    intentId: resolveTarget!,
                    outcome: resolveOutcome,
                    proofNote,
                  })}
                >
                  {resolveMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : resolveOutcome === "WIN" ? (
                    <><Trophy size={14} /> Confirm WIN</>
                  ) : (
                    <><XCircle size={14} /> Confirm LOSS</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
}
