import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import TradingCockpit from "@/components/TradingCockpit";
import Learn from "@/pages/Learn";
import { Redirect } from "wouter";
import WebResources from "@/pages/WebResources";
import Legislation from "@/pages/Legislation";
import Admin from "@/pages/Admin";
import DCASimulator from "@/pages/DCASimulator";
import Cycle from "@/pages/Cycle";
import Newsletter from "@/pages/Newsletter";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Portfolio from "@/pages/Portfolio";
import PortfolioMPT from "@/pages/PortfolioMPT";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/contexts/AuthContext";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/learn" component={Learn} />
        <Route path="/games" component={Learn} />
        <Route path="/analytics" component={Dashboard} />
        <Route path="/analytics/cockpit" component={TradingCockpit} />
        <Route path="/news">{() => <Redirect to="/cycle" />}</Route>
        <Route path="/web-resources" component={WebResources} />
        <Route path="/legislation" component={Legislation} />
        <Route path="/admin" component={Admin} />
        <Route path="/dca-simulator" component={DCASimulator} />
        <Route path="/cycle" component={Cycle} />
        <Route path="/newsletter" component={Newsletter} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/portfolio/mpt" component={PortfolioMPT} />
        <Route path="/forgot-password" component={() => (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-3">
              <h1 className="text-3xl font-bold">Forgot password</h1>
              <p className="text-muted-foreground">
                Password reset is part of the auth system that's coming back next month.
                In the meantime, the rest of BitcoinHub works fine — just dive into any page from the navigation.
              </p>
              <a href="/" className="inline-block mt-4 text-primary underline">Back to home</a>
            </div>
          </div>
        )} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
