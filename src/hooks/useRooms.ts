import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type RoomInsert = TablesInsert<'rooms'>;
type RoomUpdate = TablesUpdate<'rooms'>;

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({ title: 'Error', description: 'Failed to fetch rooms', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  const createRoom = async (room: RoomInsert) => {
    const { error } = await supabase.from('rooms').insert(room);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Room created successfully' });
    await fetchRooms();
    return true;
  };

  const updateRoom = async (id: string, updates: RoomUpdate) => {
    const { error } = await supabase.from('rooms').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Room updated successfully' });
    await fetchRooms();
    return true;
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Room deleted successfully' });
    await fetchRooms();
    return true;
  };

  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  };

  return {
    rooms,
    isLoading,
    stats,
    refetch: fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
  };
}
