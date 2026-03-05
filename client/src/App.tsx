import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Terms from "./pages/Terms";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/plans" component={Plans} />

      {/* Post-checkout incentive selection */}
      <Route path="/incentiv-select" component={IncentivSelect} />
      <Route path="/wager-select" component={IncentivSelect} />

      {/* Customer dashboard */}
      <Route path="/dashboard" component={Dashboard} />

      {/* Merchant Portal (admin only, guarded inside each page) */}
      <Route path="/merchant" component={MerchantDashboard} />
      <Route path="/merchant/campaigns" component={MerchantCampaigns} />
      <Route path="/merchant/intents" component={MerchantIntents} />
      <Route path="/merchant/settlements" component={MerchantSettlements} />
      <Route path="/merchant/resolver" component={MerchantResolver} />
      <Route path="/merchant/webhook" component={MerchantWebhook} />
      <Route path="/merchant/settings" component={MerchantSettings} />
      <Route path="/merchant/prospects" component={MerchantProspects} />

      {/* Legal */}
      <Route path="/terms" component={Terms} />

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
