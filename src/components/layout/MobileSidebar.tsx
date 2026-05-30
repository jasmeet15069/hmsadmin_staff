import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types/auth';
import { SheetClose } from '@/components/ui/sheet';
import { useRolePortalSettings } from '@/hooks/useRolePortalSettings';
import { STAFF_NAV_ITEMS } from '@/lib/staffNavigation';
import { primaryStaffRole } from '@/lib/rolePortal';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { isModuleLockedForPlan, upgradeMessage } from '@/lib/planAccess';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

const OWNER_MODULES = new Set(['settings', 'staff']);
const ALWAYS_VISIBLE_STAFF_MODULES = new Set(['staff']);

export function MobileSidebar() {
  const { user, hasAnyRole } = useAuth();
  const { settings } = useRolePortalSettings();
  const { limits } = usePlanLimits();
  const { toast } = useToast();
  const location = useLocation();

  const primaryRole = primaryStaffRole(user?.roles || []);
  const visibleModules = new Set(settings[primaryRole]?.visible_modules || []);
  const isOwner = ['platform_admin', 'hotel_admin', 'super_admin'].includes(primaryRole);
  const filteredNav = STAFF_NAV_ITEMS.filter(item => {
    if (!hasAnyRole(item.roles)) return false;
    if (isModuleLockedForPlan(item.id, limits)) return true;
    if (ALWAYS_VISIBLE_STAFF_MODULES.has(item.id)) return true;
    if (isOwner && OWNER_MODULES.has(item.id)) return true;
    return visibleModules.size === 0 || visibleModules.has(item.id);
  });

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-12 items-center border-b-2 border-border px-3">
        <h1 className="text-base font-bold tracking-tight">HotelOps</h1>
      </div>
      
      <div className="border-b-2 border-border px-3 py-2">
        <div className="text-[0.72rem] font-medium text-muted-foreground">Signed in as</div>
        <div className="truncate text-sm font-semibold">{user?.profile?.full_name || user?.email}</div>
        <div className="mt-1 inline-block bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {ROLE_LABELS[primaryRole]}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <ul className="space-y-0.5">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const locked = isModuleLockedForPlan(item.id, limits);
            
            return (
              <li key={item.href}>
                {locked ? (
                  <button
                    type="button"
                    onClick={() => toast({
                      title: 'Plan upgrade required',
                      description: upgradeMessage(item.label, limits),
                    })}
                    className="flex w-full items-center gap-2 border-2 border-dashed border-border px-2 py-1.5 text-left text-[0.78rem] font-medium text-muted-foreground transition-all hover:border-primary hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 shrink-0" />
                  </button>
                ) : (
                  <SheetClose asChild>
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2 border-2 px-2 py-1.5 text-[0.78rem] font-medium transition-all',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-transparent hover:border-border hover:bg-accent'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </SheetClose>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
