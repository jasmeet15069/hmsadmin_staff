import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ComplaintAnalysis {
  analysis: {
    sentiment: 'negative' | 'very_negative' | 'neutral';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    emotionalState: 'frustrated' | 'angry' | 'disappointed' | 'concerned' | 'calm';
  };
  categorization: {
    primaryCategory: string;
    subcategory: string;
    affectedService: string;
  };
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  priorityReason: string;
  resolutionSuggestions: Array<{
    action: string;
    timeframe: 'immediate' | 'within_hour' | 'today' | 'follow_up';
    owner: 'front_desk' | 'housekeeping' | 'maintenance' | 'management' | 'food_service';
  }>;
  compensationSuggestion: string | null;
  escalationNeeded: boolean;
  escalationReason: string | null;
}

interface GuestHistory {
  isVip?: boolean;
  previousComplaints?: number;
  stayCount?: number;
}

export function useComplaintAnalysis() {
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeComplaint = useCallback(async (
    description: string,
    category?: string,
    guestHistory?: GuestHistory
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-complaint-analysis', {
        body: { description, category, guestHistory },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
      return data as ComplaintAnalysis;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to analyze complaint';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return { analysis, isLoading, error, analyzeComplaint, clearAnalysis };
}
