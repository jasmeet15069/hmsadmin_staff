import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types/auth';
import { SheetClose } from '@/components/ui/sheet';
import { useRolePortalSettings } from '@/hooks/useRolePortalSettings';
import { STAFF_NAV_ITEMS } from '@/lib/staffNavigation';
import { primaryStaffRole } from '@/lib/rolePortal';

const OWNER_MODULES = new Set(['settings', 'staff']);
const ALWAYS_VISIBLE_STAFF_MODULES = new Set(['staff']);

export function MobileSidebar() {
  const { user, hasAnyRole } = useAuth();
  const { settings } = useRolePortalSettings();
  const location = useLocation();

  const primaryRole = primaryStaffRole(user?.roles || []);
  const visibleModules = new Set(settings[primaryRole]?.visible_modules || []);
  const isOwner = ['platform_admin', 'hotel_admin', 'super_admin'].includes(primaryRole);
  const filteredNav = STAFF_NAV_ITEMS.filter(item => {
    if (!hasAnyRole(item.roles)) return false;
    if (ALWAYS_VISIBLE_STAFF_MODULES.has(item.id)) return true;
    if (isOwner && OWNER_MODULES.has(item.id)) return true;
    return visibleModules.size === 0 || visibleModules.has(item.id);
  });

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center border-b-2 border-border px-4">
        <h1 className="text-lg font-bold tracking-tight">HotelOps</h1>
      </div>
      
      <div className="border-b-2 border-border px-4 py-3">
        <div className="text-xs font-medium text-muted-foreground">Signed in as</div>
        <div className="truncate text-sm font-semibold">{user?.profile?.full_name || user?.email}</div>
        <div className="mt-1 inline-block bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {ROLE_LABELS[primaryRole]}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
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
                      'flex items-center gap-2.5 border-2 px-2.5 py-1.5 text-[0.82rem] font-medium transition-all',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-transparent hover:border-border hover:bg-accent'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
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
