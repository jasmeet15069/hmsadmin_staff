import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type StaffShift = Tables<'staff_shifts'>;

interface StaffShiftWithProfile extends StaffShift {
  profiles?: { full_name: string } | null;
}

export function useStaffShifts() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<StaffShiftWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchShifts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();

    const channel = supabase
      .channel('shifts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_shifts' }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShifts]);

  const clockIn = async () => {
    if (!user?.id) return false;

    const { error } = await supabase.from('staff_shifts').insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Clocked in successfully' });
    return true;
  };

  const clockOut = async (shiftId: string) => {
    const { error } = await supabase
      .from('staff_shifts')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', shiftId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Clocked out successfully' });
    return true;
  };

  const addNote = async (shiftId: string, note: string) => {
    const { error } = await supabase
      .from('staff_shifts')
      .update({ notes: note })
      .eq('id', shiftId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  // Get current active shift for logged-in user
  const myActiveShift = shifts.find(s => s.user_id === user?.id && !s.clock_out);
  
  // Get all currently on-duty staff
  const onDutyShifts = shifts.filter(s => !s.clock_out);

  return {
    shifts,
    isLoading,
    refetch: fetchShifts,
    clockIn,
    clockOut,
    addNote,
    myActiveShift,
    onDutyShifts,
  };
}
