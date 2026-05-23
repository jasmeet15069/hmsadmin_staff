-- Create role enum for the application
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter', 'guest');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled');

-- Create complaint status enum
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create complaint priority enum
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create room status enum
CREATE TYPE public.room_status AS ENUM ('available', 'occupied', 'maintenance', 'cleaning');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night DECIMAL(10,2) NOT NULL,
  status room_status NOT NULL DEFAULT 'available',
  amenities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guests check-in table
CREATE TABLE public.guest_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMP WITH TIME ZONE,
  actual_check_out TIMESTAMP WITH TIME ZONE,
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu categories
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  preparation_time INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory items (raw ingredients)
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2),
  is_perishable BOOLEAN NOT NULL DEFAULT false,
  expiry_date DATE,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recipes (mapping menu items to ingredients)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_required DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, inventory_item_id)
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  guest_stay_id UUID REFERENCES public.guest_stays(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  special_instructions TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  assigned_waiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kitchen_notes TEXT,
  pickup_time TIMESTAMP WITH TIME ZONE,
  delivery_time TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff shifts
CREATE TABLE public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,
  guest_stay_id UUID REFERENCES public.guest_stays(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  guest_feedback TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  guest_stay_id UUID REFERENCES public.guest_stays(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waste logs
CREATE TABLE public.waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is staff (any role except guest)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter')
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Default role is guest
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guest');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_stays_updated_at BEFORE UPDATE ON public.guest_stays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: Users can read own, staff can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: Only admin can manage
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Rooms: Staff can manage, guests can view
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Staff can manage rooms" ON public.rooms FOR ALL USING (public.is_staff(auth.uid()));

-- Guest stays: Staff can manage, guests can view own
CREATE POLICY "Staff can view all stays" ON public.guest_stays FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can view own stays" ON public.guest_stays FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Staff can manage stays" ON public.guest_stays FOR ALL USING (public.is_staff(auth.uid()));

-- Menu categories: Public read, food manager can manage
CREATE POLICY "Anyone can view categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Food manager can manage categories" ON public.menu_categories FOR ALL USING (public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));

-- Menu items: Public read, food manager can manage
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Food manager can manage menu items" ON public.menu_items FOR ALL USING (public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));

-- Inventory: Kitchen and food managers can view/manage
CREATE POLICY "Kitchen staff can view inventory" ON public.inventory_items FOR SELECT USING (public.has_role(auth.uid(), 'kitchen_manager') OR public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Kitchen staff can manage inventory" ON public.inventory_items FOR ALL USING (public.has_role(auth.uid(), 'kitchen_manager') OR public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));

-- Recipes: Kitchen and food managers can view/manage
CREATE POLICY "Kitchen staff can view recipes" ON public.recipes FOR SELECT USING (public.has_role(auth.uid(), 'kitchen_manager') OR public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Food manager can manage recipes" ON public.recipes FOR ALL USING (public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));

-- Orders: Complex access based on role
CREATE POLICY "Staff can view all orders" ON public.orders FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can view own orders" ON public.orders FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Staff and guests can create orders" ON public.orders FOR INSERT WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = guest_id);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can rate their orders" ON public.orders FOR UPDATE USING (auth.uid() = guest_id);

-- Order items
CREATE POLICY "Staff can view all order items" ON public.order_items FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.guest_id = auth.uid())
);
CREATE POLICY "Staff can manage order items" ON public.order_items FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.guest_id = auth.uid())
);

-- Staff shifts: Staff can view/manage own, admin can view all
CREATE POLICY "Staff can view own shifts" ON public.staff_shifts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all shifts" ON public.staff_shifts FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can manage own shifts" ON public.staff_shifts FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Complaints
CREATE POLICY "Staff can view all complaints" ON public.complaints FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can view own complaints" ON public.complaints FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Staff and guests can create complaints" ON public.complaints FOR INSERT WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = guest_id);
CREATE POLICY "Staff can update complaints" ON public.complaints FOR UPDATE USING (public.is_staff(auth.uid()));

-- Payments: Staff can manage
CREATE POLICY "Staff can view payments" ON public.payments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Guests can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.guest_stays WHERE guest_stays.id = payments.guest_stay_id AND guest_stays.guest_id = auth.uid())
);
CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL USING (public.is_staff(auth.uid()));

-- Waste logs: Kitchen staff can manage
CREATE POLICY "Kitchen staff can view waste logs" ON public.waste_logs FOR SELECT USING (public.has_role(auth.uid(), 'kitchen_manager') OR public.has_role(auth.uid(), 'food_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Kitchen staff can log waste" ON public.waste_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'kitchen_manager') OR public.has_role(auth.uid(), 'food_manager'));

-- Audit logs: Admin only
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;