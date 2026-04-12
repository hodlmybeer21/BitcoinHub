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
import NewsFeed from "@/pages/NewsFeed";
import WebResources from "@/pages/WebResources";
import Legislation from "@/pages/Legislation";
import Admin from "@/pages/Admin";
import DCASimulator from "@/pages/DCASimulator";
import Newsletter from "@/pages/Newsletter";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/contexts/AuthContext";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/learn" component={Learn} />
        <Route path="/analytics" component={Dashboard} />
        <Route path="/news" component={NewsFeed} />
        <Route path="/web-resources" component={WebResources} />
        <Route path="/legislation" component={Legislation} />
        <Route path="/admin" component={Admin} />
        <Route path="/dca-simulator" component={DCASimulator} />
        <Route path="/newsletter" component={Newsletter} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
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
