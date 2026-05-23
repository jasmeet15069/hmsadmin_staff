export type AppRole = 'super_admin' | 'admin' | 'food_manager' | 'kitchen_manager' | 'waiter' | 'guest';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
  roles: AppRole[];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Receptionist',
  admin: 'Admin (CEO/Owner)',
  food_manager: 'Food Manager',
  kitchen_manager: 'Kitchen Manager',
  waiter: 'Waiter/Kooli',
  guest: 'Guest',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Front desk operations, check-in/out, order placement',
  admin: 'Revenue dashboards, staff management, audit logs',
  food_manager: 'Menu CRUD, recipes, suppliers, food inventory',
  kitchen_manager: 'Live order queue, cooking workflow, inventory deduction',
  waiter: 'Delivery assignments, pickup/delivery status, tips',
  guest: 'Menu browsing, ordering, ratings, billing',
};
