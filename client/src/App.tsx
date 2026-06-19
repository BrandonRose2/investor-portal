import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminProvider } from "./contexts/AdminContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PropertyDetail from "./pages/PropertyDetail";
import InvestorDetail from "./pages/InvestorDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/directory" component={Home} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/investor/:name" component={InvestorDetail} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AdminProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
