
-- Add payment_settings table for gateway configuration
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name text NOT NULL,
  api_key text,
  secret_key text,
  webhook_url text,
  is_active boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage payment settings"
ON public.payment_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin can view payment settings"
ON public.payment_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update rooms RLS to allow super_admin (receptionist) full CRUD
DROP POLICY IF EXISTS "Staff can manage rooms" ON public.rooms;

CREATE POLICY "Admin and receptionist can manage rooms"
ON public.rooms FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_stays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
