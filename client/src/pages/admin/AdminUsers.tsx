import { useState } from "react";
import { AdminLayout, AdminPageHeader } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Users, ShieldCheck, ShieldOff, KeyRound, UserX, Copy, Check } from "lucide-react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{ open: boolean; password: string; userName: string }>({ open: false, password: "", userName: "" });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; target: any }>({ open: false, type: "", target: null });
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.admin.overview.useQuery();
  const users = overview?.users ?? [];

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("User role updated"); utils.admin.overview.invalidate(); setConfirmDialog({ open: false, type: "", target: null }); },
    onError: (e) => toast.error(e.message),
  });
  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: (data) => {
      setTempPasswordDialog({ open: true, password: data.tempPassword, userName: confirmDialog.target?.name ?? confirmDialog.target?.email ?? "User" });
      setConfirmDialog({ open: false, type: "", target: null });
      utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => { toast.success("User account suspended"); utils.admin.overview.invalidate(); setConfirmDialog({ open: false, type: "", target: null }); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = users.filter((u: any) => {
    const matchesSearch = !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPasswordDialog.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmAction = () => {
    const { type, target } = confirmDialog;
    if (!target) return;
    if (type === "promote") updateRoleMutation.mutate({ userId: target.id, role: "admin" });
    else if (type === "demote") updateRoleMutation.mutate({ userId: target.id, role: "user" });
    else if (type === "reset") resetPasswordMutation.mutate({ userId: target.id });
    else if (type === "suspend") suspendMutation.mutate({ userId: target.id });
  };

  const confirmMessages: Record<string, { title: string; body: string; btnLabel: string; btnClass: string }> = {
    promote: { title: "Promote to Admin", body: "This user will gain full admin access to the platform.", btnLabel: "Promote", btnClass: "bg-violet-600 hover:bg-violet-700 text-white" },
    demote: { title: "Demote to User", body: "This user will lose admin access.", btnLabel: "Demote", btnClass: "bg-amber-600 hover:bg-amber-700 text-white" },
    reset: { title: "Reset Password", body: "A temporary password will be generated. The user must change it on next login.", btnLabel: "Generate Password", btnClass: "bg-blue-600 hover:bg-blue-700 text-white" },
    suspend: { title: "Suspend Account", body: "This user will be demoted to 'user' role and their session may be invalidated.", btnLabel: "Suspend", btnClass: "bg-red-600 hover:bg-red-700 text-white" },
  };

  return (
    <AdminLayout>
      <AdminPageHeader title="Users" subtitle="Manage user accounts, roles, and access" />

      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(["all", "admin", "user"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {r === "all" ? `All (${users.length})` : `${r === "admin" ? "Admins" : "Users"} (${users.filter((u: any) => u.role === r).length})`}
              </button>
            ))}
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Login Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Sign-in</th>
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
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No users found</p>
                    </td>
                  </tr>
                ) : filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-600">
                            {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.name ?? "—"}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className={`text-xs ${u.role === "admin" ? "bg-violet-100 text-violet-700 border-violet-200" : ""}`}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{u.loginMethod ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === "user" ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600" title="Promote to Admin"
                            onClick={() => setConfirmDialog({ open: true, type: "promote", target: u })}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600" title="Demote to User"
                            onClick={() => setConfirmDialog({ open: true, type: "demote", target: u })}>
                            <ShieldOff className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {u.loginMethod === "email" && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" title="Reset Password"
                            onClick={() => setConfirmDialog({ open: true, type: "reset", target: u })}>
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" title="Suspend Account"
                          onClick={() => setConfirmDialog({ open: true, type: "suspend", target: u })}>
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Confirm Action Dialog */}
      {confirmDialog.open && confirmMessages[confirmDialog.type] && (
        <Dialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog({ open: false, type: "", target: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmMessages[confirmDialog.type].title} — {confirmDialog.target?.name ?? confirmDialog.target?.email}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">{confirmMessages[confirmDialog.type].body}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, type: "", target: null })}>Cancel</Button>
              <Button
                className={confirmMessages[confirmDialog.type].btnClass}
                disabled={updateRoleMutation.isPending || resetPasswordMutation.isPending || suspendMutation.isPending}
                onClick={handleConfirmAction}
              >
                {confirmMessages[confirmDialog.type].btnLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Temp Password Dialog */}
      <Dialog open={tempPasswordDialog.open} onOpenChange={() => setTempPasswordDialog({ open: false, password: "", userName: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-700">Temporary Password Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Share this temporary password with <strong>{tempPasswordDialog.userName}</strong>. They should change it immediately after logging in.
            </p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-3">
              <code className="flex-1 text-emerald-400 font-mono text-sm tracking-wider">{tempPasswordDialog.password}</code>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ This password will not be shown again. Copy it before closing.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPasswordDialog({ open: false, password: "", userName: "" })}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
