import type { ElementType } from 'react';
import {
  BarChart3,
  Bed,
  ChefHat,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { AppRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/types/auth';

export interface StaffNavItem {
  id: string;
  label: string;
  href: string;
  icon: ElementType;
  roles: AppRole[];
}

export interface RolePortalPreset {
  role: AppRole;
  title: string;
  description: string;
  defaultPath: string;
  modules: string[];
}

export const STAFF_NAV_ITEMS: StaffNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'] },
  { id: 'staff', label: 'Staff', href: '/staff', icon: UserCog, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'housekeeping', 'maintenance', 'super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'] },
  { id: 'rooms', label: 'Rooms', href: '/rooms', icon: Bed, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin'] },
  { id: 'guests', label: 'Guests / Bookings', href: '/guests', icon: Users, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin'] },
  { id: 'housekeeping', label: 'Housekeeping', href: '/housekeeping', icon: ClipboardCheck, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'housekeeping', 'super_admin'] },
  { id: 'maintenance', label: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'maintenance', 'super_admin'] },
  { id: 'complaints', label: 'Complaints', href: '/complaints', icon: MessageSquareWarning, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin', 'food_manager'] },
  { id: 'payments', label: 'Payments', href: '/payments', icon: CreditCard, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'super_admin', 'admin'] },
  { id: 'menu', label: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'food_manager'] },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: Package, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'food_manager', 'kitchen_manager'] },
  { id: 'order_queue', label: 'Order Queue', href: '/kitchen', icon: ChefHat, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'kitchen_manager', 'waiter'] },
  { id: 'reports', label: 'Reports', href: '/reports', icon: BarChart3, roles: ['platform_admin', 'hotel_admin', 'property_manager', 'super_admin'] },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, roles: ['platform_admin', 'hotel_admin', 'super_admin'] },
  { id: 'platform', label: 'Platform', href: '/platform', icon: ShieldCheck, roles: ['platform_admin'] },
];

export const ROLE_PORTAL_ROLES: AppRole[] = [
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
];

export const ROLE_PORTAL_PRESETS: Record<AppRole, RolePortalPreset> = {
  platform_admin: {
    role: 'platform_admin',
    title: ROLE_LABELS.platform_admin,
    description: ROLE_DESCRIPTIONS.platform_admin,
    defaultPath: '/platform',
    modules: ['platform', 'dashboard', 'reports', 'settings'],
  },
  super_admin: {
    role: 'super_admin',
    title: ROLE_LABELS.super_admin,
    description: 'Owner control across setup, staff, reports, payments, and all operations.',
    defaultPath: '/dashboard',
    modules: ['dashboard', 'rooms', 'guests', 'housekeeping', 'maintenance', 'complaints', 'payments', 'menu', 'inventory', 'order_queue', 'reports', 'settings', 'staff'],
  },
  hotel_admin: {
    role: 'hotel_admin',
    title: ROLE_LABELS.hotel_admin,
    description: ROLE_DESCRIPTIONS.hotel_admin,
    defaultPath: '/dashboard',
    modules: ['dashboard', 'rooms', 'guests', 'housekeeping', 'maintenance', 'complaints', 'payments', 'menu', 'inventory', 'order_queue', 'reports', 'settings', 'staff'],
  },
  property_manager: {
    role: 'property_manager',
    title: ROLE_LABELS.property_manager,
    description: ROLE_DESCRIPTIONS.property_manager,
    defaultPath: '/dashboard',
    modules: ['dashboard', 'staff', 'rooms', 'guests', 'housekeeping', 'maintenance', 'complaints', 'payments', 'menu', 'inventory', 'order_queue', 'reports'],
  },
  receptionist: {
    role: 'receptionist',
    title: ROLE_LABELS.receptionist,
    description: ROLE_DESCRIPTIONS.receptionist,
    defaultPath: '/guests',
    modules: ['dashboard', 'staff', 'rooms', 'guests', 'complaints', 'payments'],
  },
  admin: {
    role: 'admin',
    title: `${ROLE_LABELS.admin} (Legacy)`,
    description: ROLE_DESCRIPTIONS.admin,
    defaultPath: '/guests',
    modules: ['dashboard', 'staff', 'rooms', 'guests', 'complaints', 'payments'],
  },
  housekeeping: {
    role: 'housekeeping',
    title: ROLE_LABELS.housekeeping,
    description: ROLE_DESCRIPTIONS.housekeeping,
    defaultPath: '/housekeeping',
    modules: ['staff', 'housekeeping'],
  },
  maintenance: {
    role: 'maintenance',
    title: ROLE_LABELS.maintenance,
    description: ROLE_DESCRIPTIONS.maintenance,
    defaultPath: '/maintenance',
    modules: ['staff', 'maintenance'],
  },
  food_manager: {
    role: 'food_manager',
    title: ROLE_LABELS.food_manager,
    description: ROLE_DESCRIPTIONS.food_manager,
    defaultPath: '/menu',
    modules: ['dashboard', 'staff', 'menu', 'inventory', 'complaints'],
  },
  kitchen_manager: {
    role: 'kitchen_manager',
    title: ROLE_LABELS.kitchen_manager,
    description: ROLE_DESCRIPTIONS.kitchen_manager,
    defaultPath: '/kitchen',
    modules: ['dashboard', 'staff', 'order_queue', 'inventory'],
  },
  waiter: {
    role: 'waiter',
    title: ROLE_LABELS.waiter,
    description: ROLE_DESCRIPTIONS.waiter,
    defaultPath: '/kitchen',
    modules: ['staff', 'order_queue'],
  },
  guest: {
    role: 'guest',
    title: ROLE_LABELS.guest,
    description: ROLE_DESCRIPTIONS.guest,
    defaultPath: '/guest',
    modules: [],
  },
};

export function navItemByID(id: string) {
  return STAFF_NAV_ITEMS.find(item => item.id === id);
}

export function moduleIDByPath(path: string) {
  return STAFF_NAV_ITEMS.find(item => item.href === path)?.id || '';
}

export function rolePortalPreset(role: AppRole) {
  return ROLE_PORTAL_PRESETS[role] || ROLE_PORTAL_PRESETS.guest;
}
