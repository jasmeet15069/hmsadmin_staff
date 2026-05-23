import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type GuestStay = Tables<'guest_stays'>;
type GuestStayInsert = TablesInsert<'guest_stays'>;
type GuestStayUpdate = TablesUpdate<'guest_stays'>;

interface GuestStayWithRoom extends GuestStay {
  rooms?: { room_number: string; room_type: string } | null;
}

export function useGuestStays() {
  const [stays, setStays] = useState<GuestStayWithRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStays = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('guest_stays')
        .select('*, rooms(room_number, room_type)')
        .order('check_in_date', { ascending: false });

      if (error) throw error;
      setStays(data || []);
    } catch (error) {
      console.error('Error fetching guest stays:', error);
      toast({ title: 'Error', description: 'Failed to fetch guest stays', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStays();

    const channel = supabase
      .channel('guest-stays-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_stays' }, () => {
        fetchStays();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStays]);

  const checkIn = async (stayId: string) => {
    const { error } = await supabase
      .from('guest_stays')
      .update({ actual_check_in: new Date().toISOString() })
      .eq('id', stayId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Guest checked in successfully' });
    await fetchStays();
    return true;
  };

  const checkOut = async (stayId: string, roomId: string) => {
    const { error: stayError } = await supabase
      .from('guest_stays')
      .update({ actual_check_out: new Date().toISOString() })
      .eq('id', stayId);

    if (stayError) {
      toast({ title: 'Error', description: stayError.message, variant: 'destructive' });
      return false;
    }

    // Update room status to cleaning
    await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', roomId);
    toast({ title: 'Success', description: 'Guest checked out successfully' });
    await fetchStays();
    return true;
  };

  const createStay = async (stay: GuestStayInsert) => {
    const { error } = await supabase.from('guest_stays').insert(stay);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    // Update room status to occupied
    await supabase.from('rooms').update({ status: 'occupied' }).eq('id', stay.room_id);
    toast({ title: 'Success', description: 'Booking created successfully' });
    await fetchStays();
    return true;
  };

  const updateStay = async (id: string, updates: GuestStayUpdate) => {
    const { error } = await supabase.from('guest_stays').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Stay updated successfully' });
    await fetchStays();
    return true;
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIns = stays.filter(s => s.check_in_date === today && !s.actual_check_in).length;
  const todayCheckOuts = stays.filter(s => s.check_out_date === today && !s.actual_check_out).length;
  const currentGuests = stays.filter(s => s.actual_check_in && !s.actual_check_out).length;

  return {
    stays,
    isLoading,
    refetch: fetchStays,
    checkIn,
    checkOut,
    createStay,
    updateStay,
    todayCheckIns,
    todayCheckOuts,
    currentGuests,
  };
}
