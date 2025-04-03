import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Profile from "@/pages/profile";
import AcUnits from "@/pages/ac-units";
import Reminders from "@/pages/reminders";
import { AuthProvider } from "./lib/auth";
import { Layout } from "@/components/navigation/sidebar";
import { useAuth } from "./lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    // Use wouter location instead of direct window.location for better routing
    setLocation("/login");
    return null;
  }
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    setLocation("/");
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/signup" component={() => <PublicRoute component={Signup} />} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/ac-units" component={() => <ProtectedRoute component={AcUnits} />} />
      <Route path="/reminders" component={() => <ProtectedRoute component={Reminders} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
