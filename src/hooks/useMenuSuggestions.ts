import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MenuRecommendation {
  itemId: string;
  itemName: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface SuggestionsResponse {
  recommendations: MenuRecommendation[];
  personalNote: string;
}

interface MenuPreferences {
  dietaryRestrictions?: string[];
  favoriteCategories?: string[];
  allergies?: string[];
}

export function useMenuSuggestions() {
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (
    menuItems: { id: string; name: string; category: string; price: number; description?: string }[],
    preferences?: MenuPreferences,
    pastOrders?: string[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 11 ? 'morning' : hour < 15 ? 'afternoon' : 'evening';

      const { data, error: fnError } = await supabase.functions.invoke('ai-menu-suggestions', {
        body: { menuItems, preferences, pastOrders, timeOfDay },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setSuggestions(data);
      return data;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to get suggestions';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
    setError(null);
  }, []);

  return { suggestions, isLoading, error, getSuggestions, clearSuggestions };
}
