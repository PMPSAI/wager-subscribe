/**
 * Merchant view: list of customer predictions from the widget
 */
import MerchantLayout from "@/components/MerchantLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target, Clock, CheckCircle, XCircle, TrendingUp, DollarSign,
  RefreshCw,
} from "lucide-react";

const statusColors: Record<string, string> = {
  TRACKING: "bg-blue-100 text-blue-700",
  PENDING_RESOLUTION: "bg-yellow-100 text-yellow-700",
  RESOLVED_WIN: "bg-emerald-100 text-emerald-700",
  RESOLVED_LOSS: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  CREATED: "bg-gray-100 text-gray-600",
};

const statusIcons: Record<string, React.ReactNode> = {
  TRACKING: <Clock size={12} />,
  PENDING_RESOLUTION: <Target size={12} />,
  RESOLVED_WIN: <CheckCircle size={12} />,
  RESOLVED_LOSS: <XCircle size={12} />,
};

export default function MerchantPredictions() {
  const { user, loading } = useAuth();
  const { data: predictions, isLoading, refetch } = trpc.merchant.listPredictions.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (loading || !user) return null;

  const stats = {
    total: predictions?.length ?? 0,
    tracking: predictions?.filter((p: any) => p.status === "TRACKING").length ?? 0,
    wins: predictions?.filter((p: any) => p.status === "RESOLVED_WIN").length ?? 0,
    losses: predictions?.filter((p: any) => p.status === "RESOLVED_LOSS").length ?? 0,
  };

  return (
    <MerchantLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Widget Predictions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customer predictions from your embeddable widget</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: Target, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Tracking", value: stats.tracking, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Wins", value: stats.wins, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !predictions?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No widget predictions yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Predictions appear here when customers use your embeddable widget and place a prediction
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "Market", "Choice", "Status", "Created"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {predictions.map((intent: any) => {
                const terms = intent.termsSnapshot ?? {};
                return (
                  <tr key={intent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">#{intent.id}</td>
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <p className="font-medium text-gray-800 truncate text-xs">
                        {terms?.conditionLabel ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {intent.userChoice === "yes" ? "Yes" : intent.userChoice === "no" ? "No" : "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[intent.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusIcons[intent.status]}
                        {intent.status?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {intent.createdAt ? new Date(intent.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </MerchantLayout>
  );
}
