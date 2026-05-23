-- Guest preferences table for dietary restrictions, allergies, favorites
CREATE TABLE public.guest_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  favorite_categories TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can view own preferences" 
ON public.guest_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON public.guest_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON public.guest_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Staff can view guest preferences for service
CREATE POLICY "Staff can view all preferences" 
ON public.guest_preferences 
FOR SELECT 
USING (is_staff(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_guest_preferences_updated_at
BEFORE UPDATE ON public.guest_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();