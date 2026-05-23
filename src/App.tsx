import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import KitchenQueue from "./pages/KitchenQueue";
import RoomsPage from "./pages/RoomsPage";
import MenuPage from "./pages/MenuPage";
import InventoryPage from "./pages/InventoryPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import CheckInOutPage from "./pages/CheckInOutPage";
import PaymentsPage from "./pages/PaymentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

type StaffRole = 'super_admin' | 'admin' | 'food_manager' | 'kitchen_manager' | 'waiter';
const STAFF_ROLES: StaffRole[] = ['super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'];

function StaffRoute({ children, roles = STAFF_ROLES }: { children: React.ReactNode; roles?: StaffRole[] }) {
  const { user, loading, hasAnyRole } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/staff-login" replace />;
  if (!hasAnyRole(STAFF_ROLES)) return <Navigate to="/client-login" replace />;
  if (!hasAnyRole(roles)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff-login" replace />} />
      <Route path="/auth" element={<Navigate to="/staff-login" replace />} />
      <Route path="/staff-login" element={<AuthPage portal="staff" />} />
      
      {/* Staff Routes */}
      <Route path="/dashboard" element={<StaffRoute><Dashboard /></StaffRoute>} />
      <Route path="/rooms" element={<StaffRoute roles={['super_admin', 'admin']}><RoomsPage /></StaffRoute>} />
      <Route path="/guests" element={<StaffRoute roles={['super_admin']}><CheckInOutPage /></StaffRoute>} />
      <Route path="/payments" element={<StaffRoute roles={['super_admin', 'admin']}><PaymentsPage /></StaffRoute>} />
      <Route path="/kitchen" element={<StaffRoute roles={['kitchen_manager']}><KitchenQueue /></StaffRoute>} />
      <Route path="/menu" element={<StaffRoute roles={['food_manager', 'admin']}><MenuPage /></StaffRoute>} />
      <Route path="/inventory" element={<StaffRoute roles={['food_manager', 'kitchen_manager', 'admin']}><InventoryPage /></StaffRoute>} />
      <Route path="/complaints" element={<StaffRoute roles={['super_admin', 'admin', 'food_manager']}><ComplaintsPage /></StaffRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
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
