import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import IncentivSelect from "./pages/WagerSelect";
import Dashboard from "./pages/Dashboard";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantCampaigns from "./pages/merchant/MerchantCampaigns";
import MerchantIntents from "./pages/merchant/MerchantIntents";
import MerchantSettlements from "./pages/merchant/MerchantSettlements";
import MerchantResolver from "./pages/merchant/MerchantResolver";
import MerchantWebhook from "./pages/merchant/MerchantWebhook";
import MerchantSettings from "./pages/merchant/MerchantSettings";
import MerchantProspects from "./pages/merchant/MerchantProspects";
import MerchantPredictions from "./pages/merchant/MerchantPredictions";
import Terms from "./pages/Terms";
import Widget from "./pages/Widget";
import AuthPage from "./pages/AuthPage";

// ── New Admin Portal pages ───────────────────────────────────────────────────
import AdminOverview from "./pages/admin/AdminOverview";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminPendingMerchants from "./pages/admin/AdminPendingMerchants";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminMarkets from "./pages/admin/AdminMarkets";
import AdminSettings from "./pages/admin/AdminSettings";

function Router() {
  return (
    <Switch>
      {/* ── Public ──────────────────────────────────────────────────────── */}
      <Route path="/" component={Home} />
      <Route path="/plans" component={Plans} />
      <Route path="/terms" component={Terms} />
      <Route path="/widget/:slug">
        {(params) => <Widget merchantSlug={params.slug} />}
      </Route>
      <Route path="/widget">{() => <Widget />}</Route>

      {/* ── Auth ────────────────────────────────────────────────────────── */}
      <Route path="/auth">
        {() => <AuthPage defaultMode="login" />}
      </Route>
      {/* Legacy merchant signup URL — now uses unified auth in signup mode */}
      <Route path="/merchant/signup">
        {() => <AuthPage defaultMode="signup" redirectTo="/merchant" />}
      </Route>

      {/* ── Post-checkout incentive selection (requires auth) ────────────── */}
      <Route path="/incentiv-select">
        {() => (
          <AuthGuard>
            <IncentivSelect />
          </AuthGuard>
        )}
      </Route>
      <Route path="/wager-select">
        {() => (
          <AuthGuard>
            <IncentivSelect />
          </AuthGuard>
        )}
      </Route>

      {/* ── Customer dashboard (requires auth) ──────────────────────────── */}
      <Route path="/dashboard">
        {() => (
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        )}
      </Route>

      {/* ── Merchant Portal (admin or merchant with account) ───────────────── */}
      <Route path="/merchant">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantDashboard />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/campaigns">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantCampaigns />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/intents">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantIntents />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/predictions">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantPredictions />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/settlements">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantSettlements />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/resolver">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantResolver />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/webhook">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantWebhook />
          </AuthGuard>
        )}
      </Route>
      <Route path="/merchant/settings">
        {() => (
          <AuthGuard role="admin_or_merchant">
            <MerchantSettings />
          </AuthGuard>
        )}
      </Route>

      {/* ── Admin Portal (requires admin role) ──────────────────────────── */}
      <Route path="/admin">
        {() => (
          <AuthGuard role="admin">
            <AdminOverview />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/merchants">
        {() => (
          <AuthGuard role="admin">
            <AdminMerchants />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/merchants/pending">
        {() => (
          <AuthGuard role="admin">
            <AdminPendingMerchants />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <AuthGuard role="admin">
            <AdminUsers />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/compliance">
        {() => (
          <AuthGuard role="admin">
            <AdminCompliance />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/audit">
        {() => (
          <AuthGuard role="admin">
            <AdminAuditLog />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/markets">
        {() => (
          <AuthGuard role="admin">
            <AdminMarkets />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <AuthGuard role="admin">
            <AdminSettings />
          </AuthGuard>
        )}
      </Route>
      {/* Prospects — admin-only, accessible from admin sidebar */}
      <Route path="/admin/prospects">
        {() => (
          <AuthGuard role="admin">
            <MerchantProspects />
          </AuthGuard>
        )}
      </Route>
      {/* Legacy redirect: /merchant/prospects → /admin/prospects */}
      <Route path="/merchant/prospects">
        {() => (
          <AuthGuard role="admin">
            <MerchantProspects />
          </AuthGuard>
        )}
      </Route>

      {/* ── Fallback ────────────────────────────────────────────────────── */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
