import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GuestPreferences {
  id: string;
  user_id: string;
  dietary_restrictions: string[];
  allergies: string[];
  favorite_categories: string[];
  notes: string | null;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Halal',
  'Kosher',
  'Low-Sodium',
  'Dairy-Free',
  'Keto',
];

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree Nuts',
  'Shellfish',
  'Fish',
  'Eggs',
  'Milk',
  'Wheat',
  'Soy',
  'Sesame',
];

const CATEGORY_OPTIONS = [
  'Breakfast',
  'Main Course',
  'Desserts',
  'Beverages',
  'Snacks',
  'Healthy',
  'Comfort Food',
];

export function useGuestPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<GuestPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('guest_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = useCallback(async (updates: Partial<Omit<GuestPreferences, 'id' | 'user_id'>>) => {
    if (!user?.id) return false;

    setIsSaving(true);
    try {
      if (preferences) {
        const { error } = await supabase
          .from('guest_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('guest_preferences')
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }

      await fetchPreferences();
      toast({ title: 'Preferences saved', description: 'Your preferences have been updated.' });
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({ title: 'Error', description: 'Failed to save preferences.', variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, preferences, fetchPreferences, toast]);

  return {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
    DIETARY_OPTIONS,
    ALLERGY_OPTIONS,
    CATEGORY_OPTIONS,
  };
}
