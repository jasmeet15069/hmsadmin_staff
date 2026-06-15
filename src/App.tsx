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
import PlanLockedPage from "./pages/PlanLockedPage";
import UsersPage from "./pages/UsersPage";
import RevenuePage from "./pages/RevenuePage";
import ProcurementPage from "./pages/ProcurementPage";
import CrmPage from "./pages/CrmPage";
import ChannelPage from "./pages/ChannelPage";
import NightAuditPage from "./pages/NightAuditPage";
import BookingEnginePage from "./pages/BookingEnginePage";
import MultiPropertyPage from "./pages/MultiPropertyPage";
import PosPage from "./pages/PosPage";
import NotFound from "./pages/NotFound";
import { defaultPortalPath } from "@/lib/rolePortal";
import { useHotelBranding } from "@/hooks/useHotelBranding";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { isModuleLockedForPlan } from "@/lib/planAccess";

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
const OWNER_ROLES: StaffRole[] = ['platform_admin', 'hotel_admin', 'super_admin'];
const PROPERTY_OPS_ROLES: StaffRole[] = [...OWNER_ROLES, 'property_manager'];
const FRONT_DESK_ROLES: StaffRole[] = [...OWNER_ROLES, 'property_manager', 'receptionist', 'admin'];
const PAYMENT_ROLES: StaffRole[] = [...OWNER_ROLES, 'receptionist', 'admin'];
const DASHBOARD_ROLES: StaffRole[] = [...OWNER_ROLES, 'property_manager', 'receptionist', 'admin'];
const FOOD_MANAGER_ROLES: StaffRole[] = [...OWNER_ROLES, 'food_manager'];
const KITCHEN_ROLES: StaffRole[] = [...OWNER_ROLES, 'kitchen_manager', 'waiter'];
const INVENTORY_ROLES: StaffRole[] = [...OWNER_ROLES, 'food_manager', 'kitchen_manager'];

function StaffRoute({ children, roles = STAFF_ROLES, moduleID }: { children: React.ReactNode; roles?: StaffRole[]; moduleID?: string }) {
  const { user, loading, hasAnyRole } = useAuth();
  const { limits, loading: planLoading } = usePlanLimits();
  
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
  if (moduleID && planLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Checking plan...</div>
      </div>
    );
  }
  if (moduleID && isModuleLockedForPlan(moduleID, limits)) return <PlanLockedPage moduleID={moduleID} />;
  return <>{children}</>;
}

function AppRoutes() {
  useHotelBranding();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff-login" replace />} />
      <Route path="/auth" element={<Navigate to="/staff-login" replace />} />
      <Route path="/staff-login" element={<AuthPage portal="staff" />} />
      
      {/* Staff Routes */}
      <Route path="/dashboard" element={<StaffRoute roles={DASHBOARD_ROLES} moduleID="dashboard"><Dashboard /></StaffRoute>} />
      <Route path="/rooms" element={<StaffRoute roles={FRONT_DESK_ROLES} moduleID="rooms"><RoomsPage /></StaffRoute>} />
      <Route path="/guests" element={<StaffRoute roles={FRONT_DESK_ROLES} moduleID="guests"><CheckInOutPage /></StaffRoute>} />
      <Route path="/payments" element={<StaffRoute roles={PAYMENT_ROLES} moduleID="payments"><PaymentsPage /></StaffRoute>} />
      <Route path="/housekeeping" element={<StaffRoute roles={[...PROPERTY_OPS_ROLES, 'housekeeping']} moduleID="housekeeping"><HousekeepingPage /></StaffRoute>} />
      <Route path="/maintenance" element={<StaffRoute roles={[...PROPERTY_OPS_ROLES, 'maintenance']} moduleID="maintenance"><MaintenancePage /></StaffRoute>} />
      <Route path="/pos" element={<StaffRoute roles={KITCHEN_ROLES} moduleID="pos"><PosPage /></StaffRoute>} />
      <Route path="/kitchen" element={<StaffRoute roles={KITCHEN_ROLES} moduleID="order_queue"><KitchenQueue /></StaffRoute>} />
      <Route path="/menu" element={<StaffRoute roles={FOOD_MANAGER_ROLES} moduleID="menu"><MenuPage /></StaffRoute>} />
      <Route path="/inventory" element={<StaffRoute roles={INVENTORY_ROLES} moduleID="inventory"><InventoryPage /></StaffRoute>} />
      <Route path="/complaints" element={<StaffRoute roles={PAYMENT_ROLES} moduleID="complaints"><ComplaintsPage /></StaffRoute>} />
      <Route path="/reports" element={<StaffRoute roles={PROPERTY_OPS_ROLES} moduleID="reports"><ReportsPage /></StaffRoute>} />
      <Route path="/settings" element={<StaffRoute roles={HOTEL_ADMIN_ROLES} moduleID="settings"><SettingsPage /></StaffRoute>} />
      <Route path="/staff" element={<StaffRoute roles={STAFF_ROLES} moduleID="staff"><StaffPage /></StaffRoute>} />
      <Route path="/platform" element={<StaffRoute roles={['platform_admin']}><PlatformPage /></StaffRoute>} />
      <Route path="/users" element={<StaffRoute roles={HOTEL_ADMIN_ROLES}><UsersPage /></StaffRoute>} />
      <Route path="/revenue" element={<StaffRoute roles={['platform_admin','hotel_admin','property_manager','super_admin']} moduleID="revenue"><RevenuePage /></StaffRoute>} />
      <Route path="/procurement" element={<StaffRoute roles={['platform_admin','hotel_admin','super_admin']} moduleID="procurement"><ProcurementPage /></StaffRoute>} />
      <Route path="/crm" element={<StaffRoute roles={['platform_admin','hotel_admin','super_admin']} moduleID="crm"><CrmPage /></StaffRoute>} />
      <Route path="/channels" element={<StaffRoute roles={['platform_admin','hotel_admin','super_admin']} moduleID="channels"><ChannelPage /></StaffRoute>} />
      <Route path="/night-audit" element={<StaffRoute roles={['platform_admin','hotel_admin','super_admin']} moduleID="night-audit"><NightAuditPage /></StaffRoute>} />
      <Route path="/booking-engine" element={<StaffRoute roles={['platform_admin','hotel_admin','super_admin']} moduleID="booking-engine"><BookingEnginePage /></StaffRoute>} />
      <Route path="/multi-property" element={<StaffRoute roles={['platform_admin','super_admin']} moduleID="multi-property"><MultiPropertyPage /></StaffRoute>} />
      
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
