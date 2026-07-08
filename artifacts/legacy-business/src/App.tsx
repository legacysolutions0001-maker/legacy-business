import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Layout from "./components/Layout";
import SuperAdminLayout from "./components/SuperAdminLayout";
import LoginPage from "./pages/LoginPage";
import SuperLoginPage from "./pages/SuperLoginPage";

import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";
import Invoices from "./pages/Invoices";
import HR from "./pages/HR";
import Salary from "./pages/Salary";
import Purchase from "./pages/Purchase";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import CompanySettings from "./pages/CompanySettings";
import EWayBill from "./pages/EWayBill";
import DayBook from "./pages/DayBook";
import Returns from "./pages/Returns";
import CashBank from "./pages/CashBank";
import Backup from "./pages/Backup";

import SuperDashboard from "./pages/super/SuperDashboard";
import SuperCompanies from "./pages/super/SuperCompanies";
import SuperUsers from "./pages/super/SuperUsers";
import SuperSubscriptions from "./pages/super/SuperSubscriptions";
import SuperSettings from "./pages/super/SuperSettings";
import SuperNotifications from "./pages/super/SuperNotifications";

import Messaging from "./pages/Messaging";
import Ledger from "./pages/Ledger";
import NotFound from "@/pages/not-found";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function CompanyRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (isSuperAdmin) return <Redirect to="/super" />;
  return <Layout><Component /></Layout>;
}

function SuperRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Redirect to="/super" />;
  if (!isSuperAdmin) return <Redirect to="/login" />;
  return <SuperAdminLayout><Component /></SuperAdminLayout>;
}

function HomeRedirect() {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (isSuperAdmin) return <Redirect to="/super/dashboard" />;
  return <Redirect to="/dashboard" />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/super" component={SuperLoginPage} />

      <Route path="/dashboard"><CompanyRoute component={Dashboard} /></Route>
      <Route path="/customers"><CompanyRoute component={Customers} /></Route>
      <Route path="/suppliers"><CompanyRoute component={Suppliers} /></Route>
      <Route path="/inventory"><CompanyRoute component={Inventory} /></Route>
      <Route path="/billing"><CompanyRoute component={Invoices} /></Route>
      <Route path="/invoices"><CompanyRoute component={Invoices} /></Route>
      <Route path="/hr"><CompanyRoute component={HR} /></Route>
      <Route path="/salary"><CompanyRoute component={Salary} /></Route>
      <Route path="/purchase"><CompanyRoute component={Purchase} /></Route>
      <Route path="/returns"><CompanyRoute component={Returns} /></Route>
      <Route path="/payments"><CompanyRoute component={Payments} /></Route>
      <Route path="/cash-bank"><CompanyRoute component={CashBank} /></Route>
      <Route path="/reports"><CompanyRoute component={Reports} /></Route>
      <Route path="/notifications"><CompanyRoute component={Notifications} /></Route>
      <Route path="/settings"><CompanyRoute component={CompanySettings} /></Route>
      <Route path="/eway-bill"><CompanyRoute component={EWayBill} /></Route>
      <Route path="/messaging"><CompanyRoute component={Messaging} /></Route>
      <Route path="/ledger"><CompanyRoute component={Ledger} /></Route>
      <Route path="/daybook"><CompanyRoute component={DayBook} /></Route>
      <Route path="/backup"><CompanyRoute component={Backup} /></Route>

      <Route path="/super/dashboard"><SuperRoute component={SuperDashboard} /></Route>
      <Route path="/super/companies"><SuperRoute component={SuperCompanies} /></Route>
      <Route path="/super/users"><SuperRoute component={SuperUsers} /></Route>
      <Route path="/super/subscriptions"><SuperRoute component={SuperSubscriptions} /></Route>
      <Route path="/super/settings"><SuperRoute component={SuperSettings} /></Route>
      <Route path="/super/notifications"><SuperRoute component={SuperNotifications} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={0}>
            <WouterRouter base={basePath}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
