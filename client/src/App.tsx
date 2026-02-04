import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/Layout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import CreateSale from "@/pages/CreateSale";
import Purchases from "@/pages/Purchases";
import CreatePurchase from "@/pages/CreatePurchase";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Expenses from "@/pages/Expenses";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        {/* Protected Routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/sales" component={Sales} />
        <Route path="/sales/new" component={CreateSale} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/purchases/new" component={CreatePurchase} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/customers" component={Customers} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/expenses" component={Expenses} />
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
