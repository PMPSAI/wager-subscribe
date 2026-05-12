import { useState } from "react";
import { AdminLayout, AdminPageHeader } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, TrendingUp, RefreshCw, ToggleLeft, ToggleRight, Zap } from "lucide-react";

export default function AdminMarkets() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "polymarket" | "kalshi" | "manual">("all");

  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.admin.overview.useQuery();
  const markets = overview?.markets ?? [];

  const syncPolymarketMutation = trpc.markets.syncPolymarket.useMutation({
    onSuccess: (d) => { toast.success(`Synced ${d.synced} Polymarket markets`); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const syncKalshiMutation = trpc.markets.syncKalshi.useMutation({
    onSuccess: (d) => { toast.success(`Synced ${d.synced} Kalshi markets`); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const enableAllMutation = trpc.markets.enableAll.useMutation({
    onSuccess: (d) => { toast.success(`Enabled ${d.count} active markets`); utils.admin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.markets.toggleEnabled.useMutation({
    onSuccess: () => utils.admin.overview.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const autoResolveMutation = trpc.markets.autoResolveIntents.useMutation({
    onSuccess: (d) => toast.success(`Resolved ${d.resolved} intents`),
    onError: (e) => toast.error(e.message),
  });

  const filtered = markets.filter((m: any) => {
    const matchesSearch = !search || (m.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || m.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const sourceCounts = {
    all: markets.length,
    polymarket: markets.filter((m: any) => m.source === "polymarket").length,
    kalshi: markets.filter((m: any) => m.source === "kalshi").length,
    manual: markets.filter((m: any) => m.source === "manual").length,
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Prediction Markets"
        subtitle="Sync, enable, and manage prediction markets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => autoResolveMutation.mutate(undefined)} disabled={autoResolveMutation.isPending}>
              <Zap className="w-3.5 h-3.5" /> Auto-Resolve
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => enableAllMutation.mutate(undefined)} disabled={enableAllMutation.isPending}>
              <ToggleRight className="w-3.5 h-3.5" /> Enable All Active
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => syncKalshiMutation.mutate({ limit: 20 })} disabled={syncKalshiMutation.isPending}>
              <RefreshCw className="w-3.5 h-3.5" /> Sync Kalshi
            </Button>
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => syncPolymarketMutation.mutate({ limit: 20 })} disabled={syncPolymarketMutation.isPending}>
              <RefreshCw className="w-3.5 h-3.5" /> Sync Polymarket
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search markets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(["all", "polymarket", "kalshi", "manual"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${sourceFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {s} <span className="ml-1 text-slate-400">({sourceCounts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Market</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Yes / No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Resolves</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No markets found</p>
                    </td>
                  </tr>
                ) : filtered.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-slate-900 truncate" title={m.title}>{m.title}</p>
                      {m.category && <p className="text-xs text-slate-400 capitalize">{m.category}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">{m.source}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">
                      {m.yesPrice != null ? `${(Number(m.yesPrice) * 100).toFixed(0)}¢` : "—"} / {m.noPrice != null ? `${(Number(m.noPrice) * 100).toFixed(0)}¢` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {m.volume ? `$${Number(m.volume).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {m.resolutionDate ? new Date(m.resolutionDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: m.id, isEnabled: !m.isEnabled })}
                        disabled={toggleMutation.isPending}
                        className="transition-colors"
                        title={m.isEnabled ? "Disable market" : "Enable market"}
                      >
                        {m.isEnabled
                          ? <ToggleRight className="w-5 h-5 text-emerald-500 hover:text-emerald-600 mx-auto" />
                          : <ToggleLeft className="w-5 h-5 text-slate-300 hover:text-slate-400 mx-auto" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
