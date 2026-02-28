import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";

export default function MerchantCampaigns() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "MARKET", conditionText: "", windowDays: "30", rewardType: "MONTHS_FREE", rewardValue: "1" });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: () => { toast.success("Campaign created"); setOpen(false); utils.campaign.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !user) return null;

  const statusColor: Record<string, string> = { ACTIVE: "bg-emerald-100 text-emerald-700", PAUSED: "bg-yellow-100 text-yellow-700", ARCHIVED: "bg-gray-100 text-gray-500" };

  return (
    <MerchantLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your incentive campaigns and conditions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="S&P 500 Gains 5%" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["MARKET", "SPORTS", "ECONOMY", "CUSTOM"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Condition Text</Label><Textarea value={form.conditionText} onChange={e => setForm(f => ({ ...f, conditionText: e.target.value }))} rows={2} placeholder="The S&P 500 closes at least 5% higher..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Window (days)</Label><Input type="number" value={form.windowDays} onChange={e => setForm(f => ({ ...f, windowDays: e.target.value }))} /></div>
                <div><Label>Reward Value</Label><Input value={form.rewardValue} onChange={e => setForm(f => ({ ...f, rewardValue: e.target.value }))} placeholder="1 (months) or 29 (USD)" /></div>
              </div>
              <div>
                <Label>Reward Type</Label>
                <Select value={form.rewardType} onValueChange={v => setForm(f => ({ ...f, rewardType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHS_FREE">Months Free</SelectItem>
                    <SelectItem value="CREDIT_USD">Credit USD</SelectItem>
                    <SelectItem value="PERCENT_DISCOUNT">Percent Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, category: form.category as "MARKET" | "SPORTS" | "ECONOMY" | "CUSTOM", rewardType: form.rewardType as "MONTHS_FREE" | "CREDIT_USD" | "PERCENT_DISCOUNT", windowDays: parseInt(form.windowDays), eligibilityWindowDays: 30 })}
              >
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !campaigns?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No campaigns yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Status", "Created"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.isActive ? "ACTIVE" : "ARCHIVED"]}`}>
                      {c.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MerchantLayout>
  );
}
