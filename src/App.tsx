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
import SettingsPage from "./pages/SettingsPage";
import StaffPage from "./pages/StaffPage";
import HousekeepingPage from "./pages/HousekeepingPage";
import MaintenancePage from "./pages/MaintenancePage";
import ReportsPage from "./pages/ReportsPage";
import PlatformPage from "./pages/PlatformPage";
import NotFound from "./pages/NotFound";
import { defaultPortalPath } from "@/lib/rolePortal";

const queryClient = new QueryClient();

type StaffRole =
  | 'platform_admin'
  | 'hotel_admin'
  | 'property_manager'
  | 'receptionist'
  | 'housekeeping'
  | 'maintenance'
  | 'super_admin'
  | 'admin'
  | 'food_manager'
  | 'kitchen_manager'
  | 'waiter';
const STAFF_ROLES: StaffRole[] = ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'housekeeping', 'maintenance', 'super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'];
const HOTEL_ADMIN_ROLES: StaffRole[] = ['platform_admin', 'hotel_admin', 'super_admin'];
const FRONT_DESK_ROLES: StaffRole[] = ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin'];

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
  if (!hasAnyRole(roles)) return <Navigate to={defaultPortalPath(user.roles)} replace />;
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
      <Route path="/rooms" element={<StaffRoute roles={FRONT_DESK_ROLES}><RoomsPage /></StaffRoute>} />
      <Route path="/guests" element={<StaffRoute roles={FRONT_DESK_ROLES}><CheckInOutPage /></StaffRoute>} />
      <Route path="/payments" element={<StaffRoute roles={FRONT_DESK_ROLES}><PaymentsPage /></StaffRoute>} />
      <Route path="/housekeeping" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'housekeeping', 'super_admin']}><HousekeepingPage /></StaffRoute>} />
      <Route path="/maintenance" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'maintenance', 'super_admin']}><MaintenancePage /></StaffRoute>} />
      <Route path="/kitchen" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'kitchen_manager', 'waiter']}><KitchenQueue /></StaffRoute>} />
      <Route path="/menu" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'food_manager']}><MenuPage /></StaffRoute>} />
      <Route path="/inventory" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'food_manager', 'kitchen_manager']}><InventoryPage /></StaffRoute>} />
      <Route path="/complaints" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin', 'food_manager']}><ComplaintsPage /></StaffRoute>} />
      <Route path="/reports" element={<StaffRoute roles={['platform_admin', 'hotel_admin', 'property_manager', 'super_admin']}><ReportsPage /></StaffRoute>} />
      <Route path="/settings" element={<StaffRoute roles={HOTEL_ADMIN_ROLES}><SettingsPage /></StaffRoute>} />
      <Route path="/staff" element={<StaffRoute roles={HOTEL_ADMIN_ROLES}><StaffPage /></StaffRoute>} />
      <Route path="/platform" element={<StaffRoute roles={['platform_admin']}><PlatformPage /></StaffRoute>} />
      
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
