export type AppRole =
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
  | 'waiter'
  | 'guest';

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
  platform_admin: 'Platform Admin',
  hotel_admin: 'Hotel Admin',
  property_manager: 'Property Manager',
  receptionist: 'Receptionist',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  super_admin: 'Hotel Admin (Owner)',
  admin: 'Receptionist',
  food_manager: 'Food Manager',
  kitchen_manager: 'Kitchen Manager',
  waiter: 'Waiter/Kooli',
  guest: 'Guest',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  platform_admin: 'HotelOps vendor-level access across tenants',
  hotel_admin: 'Owns hotel setup, billing, staff, and operations',
  property_manager: 'Manages property operations and reports',
  receptionist: 'Front desk operations, check-in/out, and guest management',
  housekeeping: 'Room readiness and housekeeping assignments',
  maintenance: 'Work orders and maintenance queues',
  super_admin: 'Highest hotel role with full operational access',
  admin: 'Front desk operations, check-in/out, and guest management',
  food_manager: 'Menu CRUD, recipes, suppliers, food inventory',
  kitchen_manager: 'Live order queue, cooking workflow, inventory deduction',
  waiter: 'Delivery assignments, pickup/delivery status, tips',
  guest: 'Menu browsing, ordering, ratings, billing',
};
