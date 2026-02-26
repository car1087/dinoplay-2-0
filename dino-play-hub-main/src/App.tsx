import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import WorkerDashboard from "./pages/WorkerDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminDailyConfig from "./pages/admin/AdminDailyConfig";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminHistory from "./pages/admin/AdminHistory";
import AdminSettlements from "./pages/admin/AdminSettlements";
import NotFound from "./pages/NotFound";
import { Gamepad2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Gamepad2 className="h-12 w-12 text-primary animate-dino-bounce mx-auto" />
          <p className="text-sm text-muted-foreground">Conectando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (role === "admin") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminAnalytics />} />
          <Route path="config" element={<AdminDailyConfig />} />
          <Route path="workers" element={<AdminWorkers />} />
          <Route path="history" element={<AdminHistory />} />
          <Route path="settlements" element={<AdminSettlements />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  if (role === "worker") {
    return (
      <Routes>
        <Route path="/" element={<WorkerDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // No role assigned
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-3">
        <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-display font-bold">Sin acceso</h1>
        <p className="text-muted-foreground">Tu cuenta no tiene un rol asignado. Contacta al administrador.</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
