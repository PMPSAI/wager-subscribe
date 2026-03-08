import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Tab = "overview" | "merchants" | "markets" | "users" | "intents" | "subscriptions" | "prospects";

export default function AdminPortal() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  const [syncingPolymarket, setSyncingPolymarket] = useState(false);
  const [syncingKalshi, setSyncingKalshi] = useState(false);
  const [autoResolving, setAutoResolving] = useState(false);

  const me = trpc.auth.me.useQuery();
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: me.data?.role === "admin" });
  const syncPolymarket = trpc.markets.syncPolymarket.useMutation();
  const syncKalshi = trpc.markets.syncKalshi.useMutation();
  const toggleMarket = trpc.markets.toggleEnabled.useMutation();
  const autoResolve = trpc.markets.autoResolveIntents.useMutation();
  const utils = trpc.useUtils();

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!me.data || me.data.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Admin access required.</p>
          <button onClick={() => navigate("/")} className="text-blue-400 hover:underline">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const data = overview.data;

  const handleSyncPolymarket = async () => {
    setSyncingPolymarket(true);
    try {
      const result = await syncPolymarket.mutateAsync({ limit: 30 });
      toast.success(`Synced ${result.synced} Polymarket markets`);
      utils.admin.overview.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncingPolymarket(false);
    }
  };

  const handleSyncKalshi = async () => {
    setSyncingKalshi(true);
    try {
      const result = await syncKalshi.mutateAsync({ limit: 30 });
      toast.success(`Synced ${result.synced} Kalshi markets`);
      utils.admin.overview.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncingKalshi(false);
    }
  };

  const handleAutoResolve = async () => {
    setAutoResolving(true);
    try {
      const result = await autoResolve.mutateAsync();
      toast.success(`Auto-resolved ${result.resolved} markets`);
      utils.admin.overview.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Auto-resolve failed");
    } finally {
      setAutoResolving(false);
    }
  };

  const handleToggleMarket = async (id: number, current: boolean) => {
    try {
      await toggleMarket.mutateAsync({ id, isEnabled: !current });
      toast.success(!current ? "Market enabled for widget" : "Market disabled");
      utils.admin.overview.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "merchants", label: "Merchants" },
    { id: "markets", label: "Markets" },
    { id: "users", label: "Users" },
    { id: "intents", label: "Intents" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "prospects", label: "Prospects" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-yellow-400">WagerSubscribe Admin</span>
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-yellow-400 text-gray-900"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/merchant" className="text-sm text-gray-400 hover:text-white">Merchant Portal</a>
          <a href="/" className="text-sm text-gray-400 hover:text-white">Home</a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {tab === "overview" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
            {overview.isLoading ? (
              <div className="text-gray-400">Loading overview...</div>
            ) : data ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Merchants", value: data.stats.totalMerchants, sub: `${data.stats.activeMerchants} active` },
                    { label: "Total Users", value: data.stats.totalUsers, sub: "registered" },
                    { label: "Total Intents", value: data.stats.totalIntents, sub: `${data.stats.pendingIntents} tracking` },
                    { label: "Markets", value: data.stats.totalMarkets, sub: `${data.stats.enabledMarkets} enabled` },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="text-3xl font-bold text-yellow-400">{s.value}</div>
                      <div className="text-sm font-medium text-white mt-1">{s.label}</div>
                      <div className="text-xs text-gray-400">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSyncPolymarket}
                      disabled={syncingPolymarket}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium text-sm"
                    >
                      {syncingPolymarket ? "Syncing..." : "Sync Polymarket"}
                    </button>
                    <button
                      onClick={handleSyncKalshi}
                      disabled={syncingKalshi}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded font-medium text-sm"
                    >
                      {syncingKalshi ? "Syncing..." : "Sync Kalshi"}
                    </button>
                    <button
                      onClick={handleAutoResolve}
                      disabled={autoResolving}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium text-sm"
                    >
                      {autoResolving ? "Resolving..." : "Auto-Resolve Markets"}
                    </button>
                    <a
                      href="/merchant/resolver"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded font-medium text-sm"
                    >
                      Run Resolver Job
                    </a>
                  </div>
                </div>

                {/* Recent Merchants */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-4">Recent Merchants</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-800">
                          <th className="text-left py-2 pr-4">Name</th>
                          <th className="text-left py-2 pr-4">Slug</th>
                          <th className="text-left py-2 pr-4">Mode</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.merchants.slice(0, 10).map((m: any) => (
                          <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="py-2 pr-4 font-medium">{m.name}</td>
                            <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{m.slug}</td>
                            <td className="py-2 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs ${m.stripeMode === "live" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}>
                                {m.stripeMode || "test"}
                              </span>
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                                {m.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-400">No data available</div>
            )}
          </div>
        )}

        {/* Markets Tab */}
        {tab === "markets" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Prediction Markets</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncPolymarket}
                  disabled={syncingPolymarket}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium"
                >
                  {syncingPolymarket ? "Syncing..." : "Sync Polymarket"}
                </button>
                <button
                  onClick={handleSyncKalshi}
                  disabled={syncingKalshi}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm font-medium"
                >
                  {syncingKalshi ? "Syncing..." : "Sync Kalshi"}
                </button>
              </div>
            </div>
            {overview.isLoading ? (
              <div className="text-gray-400">Loading markets...</div>
            ) : (
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Source</th>
                      <th className="text-left py-3 px-4">Yes Price</th>
                      <th className="text-left py-3 px-4">Outcome</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Widget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.markets ?? []).map((m: any) => (
                      <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-4 font-medium max-w-xs truncate" title={m.title}>{m.title}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${m.source === "polymarket" ? "bg-blue-900 text-blue-300" : m.source === "kalshi" ? "bg-purple-900 text-purple-300" : "bg-gray-700 text-gray-300"}`}>
                            {m.source}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-300">{m.yesPrice ? `${(parseFloat(m.yesPrice) * 100).toFixed(0)}¢` : "—"}</td>
                        <td className="py-2 px-4">
                          {m.resolvedOutcome ? (
                            <span className={`px-2 py-0.5 rounded text-xs ${m.resolvedOutcome === "WIN" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                              {m.resolvedOutcome}
                            </span>
                          ) : (
                            <span className="text-gray-500">Pending</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                            {m.isActive ? "Active" : "Closed"}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <button
                            onClick={() => handleToggleMarket(m.id, m.isEnabled)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                              m.isEnabled
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                            }`}
                          >
                            {m.isEnabled ? "Enabled" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(data?.markets ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No markets synced yet. Click "Sync Polymarket" or "Sync Kalshi" to fetch markets.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Merchants Tab */}
        {tab === "merchants" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">All Merchants</h1>
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Slug</th>
                    <th className="text-left py-3 px-4">Stripe Mode</th>
                    <th className="text-left py-3 px-4">Stripe Key</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.merchants ?? []).map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-4 text-gray-500">{m.id}</td>
                      <td className="py-2 px-4 font-medium">{m.name}</td>
                      <td className="py-2 px-4 font-mono text-xs text-gray-400">{m.slug}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${m.stripeMode === "live" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}>
                          {m.stripeMode || "test"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {m.stripePublishableKey ? `${m.stripePublishableKey.slice(0, 12)}...` : "Not set"}
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">All Users</h1>
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Login</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.users ?? []).map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-4 text-gray-500">{u.id}</td>
                      <td className="py-2 px-4 font-medium">{u.name || "—"}</td>
                      <td className="py-2 px-4 text-gray-300">{u.email || "—"}</td>
                      <td className="py-2 px-4 text-xs text-gray-400">{u.loginMethod || "—"}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.role === "admin" ? "bg-yellow-900 text-yellow-300" : "bg-gray-700 text-gray-300"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Intents Tab */}
        {tab === "intents" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">All Prediction Intents</h1>
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Resolve At</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.intents ?? []).slice(0, 100).map((i: any) => (
                    <tr key={i.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-4 text-gray-500">{i.id}</td>
                      <td className="py-2 px-4 text-gray-300">{i.userId}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          i.status === "RESOLVED_WIN" ? "bg-green-900 text-green-300" :
                          i.status === "RESOLVED_LOSS" ? "bg-red-900 text-red-300" :
                          i.status === "TRACKING" ? "bg-blue-900 text-blue-300" :
                          "bg-gray-700 text-gray-300"
                        }`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {i.resolveAt ? new Date(i.resolveAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {tab === "subscriptions" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Merchant Subscriptions</h1>
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">Merchant</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Stripe Sub</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.merchantSubscriptions ?? []).map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-4 text-gray-500">{s.id}</td>
                      <td className="py-2 px-4 text-gray-300">{s.merchantId}</td>
                      <td className="py-2 px-4 font-medium capitalize">{s.plan}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${s.status === "active" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400 font-mono">
                        {s.stripeSubscriptionId ? `${s.stripeSubscriptionId.slice(0, 16)}...` : "—"}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {(data?.merchantSubscriptions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">No merchant subscriptions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Prospects Tab */}
        {tab === "prospects" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Prospects</h1>
              <a
                href="/merchant/prospects"
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-300 transition-colors"
              >
                Open Full Prospects View &rarr;
              </a>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
              <p className="text-gray-400 mb-4">The full prospects database is available in the dedicated prospects view.</p>
              <a
                href="/merchant/prospects"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors"
              >
                View All Prospects
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
