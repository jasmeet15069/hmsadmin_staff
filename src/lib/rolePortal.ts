import { AppRole } from '@/types/auth';

const ROLE_PRIORITY: AppRole[] = [
  'platform_admin',
  'super_admin',
  'hotel_admin',
  'property_manager',
  'receptionist',
  'admin',
  'housekeeping',
  'maintenance',
  'food_manager',
  'kitchen_manager',
  'waiter',
  'guest',
];

const DEFAULT_PATH_BY_ROLE: Partial<Record<AppRole, string>> = {
  platform_admin: '/platform',
  super_admin: '/dashboard',
  hotel_admin: '/dashboard',
  property_manager: '/dashboard',
  receptionist: '/guests',
  admin: '/guests',
  housekeeping: '/housekeeping',
  maintenance: '/maintenance',
  food_manager: '/menu',
  kitchen_manager: '/kitchen',
  waiter: '/kitchen',
};

export function primaryStaffRole(roles: AppRole[] = []) {
  return ROLE_PRIORITY.find(role => roles.includes(role) && role !== 'guest') || roles[0] || 'guest';
}

export function defaultPortalPath(roles: AppRole[] = []) {
  const primary = primaryStaffRole(roles);
  return DEFAULT_PATH_BY_ROLE[primary] || '/dashboard';
}

export function portalTitleForRole(roles: AppRole[] = []) {
  const primary = primaryStaffRole(roles);
  switch (primary) {
    case 'platform_admin':
      return 'Platform Super Admin Portal';
    case 'hotel_admin':
    case 'super_admin':
      return 'Hotel Admin Portal';
    case 'property_manager':
      return 'Property Manager Portal';
    case 'receptionist':
    case 'admin':
      return 'Receptionist Portal';
    case 'housekeeping':
      return 'Housekeeping Portal';
    case 'maintenance':
      return 'Maintenance Portal';
    case 'food_manager':
      return 'Food Manager Portal';
    case 'kitchen_manager':
      return 'Kitchen Manager Portal';
    case 'waiter':
      return 'Waiter Portal';
    default:
      return 'Staff Portal';
  }
}
