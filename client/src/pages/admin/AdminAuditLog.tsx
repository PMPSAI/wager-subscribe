import { useState } from "react";
import { AdminLayout, AdminPageHeader } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, ScrollText, Building2, Users, TrendingUp, Settings, ShieldCheck } from "lucide-react";

const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  merchant_approved: { label: "Merchant Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Building2 },
  merchant_rejected: { label: "Merchant Rejected", color: "bg-red-50 text-red-700 border-red-200", icon: Building2 },
  merchant_suspended: { label: "Merchant Suspended", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Building2 },
  merchant_reactivated: { label: "Merchant Reactivated", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Building2 },
  user_role_changed: { label: "Role Changed", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Users },
  user_password_reset: { label: "Password Reset", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Users },
  user_suspended: { label: "User Suspended", color: "bg-red-50 text-red-700 border-red-200", icon: Users },
  compliance_note_added: { label: "Compliance Note", color: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck },
  market_synced: { label: "Market Synced", color: "bg-slate-100 text-slate-600 border-slate-200", icon: TrendingUp },
  market_toggled: { label: "Market Toggled", color: "bg-slate-100 text-slate-600 border-slate-200", icon: TrendingUp },
  settings_changed: { label: "Settings Changed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Settings },
};

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: logs, isLoading } = trpc.admin.getAuditLog.useQuery({ limit: 200 });

  const actionTypes = ["all", "merchant", "user", "compliance", "market", "system"];

  const filtered = (logs ?? []).filter((log: any) => {
    const matchesSearch = !search ||
      (log.targetName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.adminName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.notes ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" ||
      (typeFilter === "merchant" && log.action.startsWith("merchant_")) ||
      (typeFilter === "user" && log.action.startsWith("user_")) ||
      (typeFilter === "compliance" && log.action === "compliance_note_added") ||
      (typeFilter === "market" && log.action.startsWith("market_")) ||
      (typeFilter === "system" && log.action === "settings_changed");
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout>
      <AdminPageHeader title="Audit Log" subtitle="Immutable record of all admin actions" />

      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by target, admin, or notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {actionTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${typeFilter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                      <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No audit log entries yet</p>
                      <p className="text-xs mt-1">Admin actions will appear here</p>
                    </td>
                  </tr>
                ) : filtered.map((log: any) => {
                  const config = actionConfig[log.action] ?? { label: log.action, color: "bg-slate-100 text-slate-600 border-slate-200", icon: Settings };
                  const Icon = config.icon;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.targetName ? (
                          <div>
                            <p className="text-sm font-medium text-slate-800">{log.targetName}</p>
                            <p className="text-xs text-slate-400 capitalize">{log.targetType}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{log.adminName ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={log.notes ?? ""}>
                        {log.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
