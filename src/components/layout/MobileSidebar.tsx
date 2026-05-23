import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Bed,
  UtensilsCrossed,
  ChefHat,
  Package,
  MessageSquareWarning,
  CreditCard,
} from 'lucide-react';
import { AppRole, ROLE_LABELS } from '@/types/auth';
import { SheetClose } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'] },
  { label: 'Rooms', href: '/rooms', icon: Bed, roles: ['super_admin', 'admin'] },
  { label: 'Guests / Bookings', href: '/guests', icon: Users, roles: ['super_admin'] },
  { label: 'Complaints', href: '/complaints', icon: MessageSquareWarning, roles: ['super_admin', 'admin', 'food_manager'] },
  { label: 'Payments', href: '/payments', icon: CreditCard, roles: ['super_admin', 'admin'] },
  { label: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['food_manager', 'admin'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['food_manager', 'kitchen_manager', 'admin'] },
  { label: 'Order Queue', href: '/kitchen', icon: ChefHat, roles: ['kitchen_manager'] },
];

export function MobileSidebar() {
  const { user, hasAnyRole } = useAuth();
  const location = useLocation();

  const filteredNav = navItems.filter(item => hasAnyRole(item.roles));
  const primaryRole = user?.roles.find(r => r !== 'guest') || user?.roles[0] || 'guest';

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b-2 border-border px-6">
        <h1 className="text-xl font-bold tracking-tight">HotelOps</h1>
      </div>
      
      <div className="border-b-2 border-border px-6 py-4">
        <div className="text-sm font-medium text-muted-foreground">Signed in as</div>
        <div className="font-semibold">{user?.profile?.full_name || user?.email}</div>
        <div className="mt-1 inline-block bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {ROLE_LABELS[primaryRole]}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <SheetClose asChild>
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 border-2 px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-transparent hover:border-border hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </SheetClose>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
