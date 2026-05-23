import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Complaint = Tables<'complaints'>;
type ComplaintInsert = TablesInsert<'complaints'>;
type ComplaintUpdate = TablesUpdate<'complaints'>;

interface ComplaintWithGuest extends Complaint {
  guest_stays?: { guest_name: string; rooms?: { room_number: string } | null } | null;
}

export function useComplaints() {
  const [complaints, setComplaints] = useState<ComplaintWithGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, guest_stays(guest_name, rooms(room_number))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast({ title: 'Error', description: 'Failed to fetch complaints', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchComplaints();

    const channel = supabase
      .channel('complaints-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchComplaints();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComplaints]);

  const createComplaint = async (complaint: ComplaintInsert) => {
    const complaintNumber = `C-${Date.now().toString().slice(-6)}`;
    const { error } = await supabase
      .from('complaints')
      .insert({ ...complaint, complaint_number: complaintNumber });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Complaint created successfully' });
    await fetchComplaints();
    return true;
  };

  const updateComplaint = async (id: string, updates: ComplaintUpdate) => {
    const { error } = await supabase.from('complaints').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Complaint updated successfully' });
    await fetchComplaints();
    return true;
  };

  const resolveComplaint = async (id: string, resolution: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('complaints')
      .update({
        status: 'resolved',
        resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Complaint resolved successfully' });
    await fetchComplaints();
    return true;
  };

  const deleteComplaint = async (id: string) => {
    const { error } = await supabase.from('complaints').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Complaint deleted successfully' });
    await fetchComplaints();
    return true;
  };

  const stats = {
    open: complaints.filter(c => c.status === 'open').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    critical: complaints.filter(c => c.priority === 'critical' && c.status !== 'resolved').length,
  };

  return {
    complaints,
    isLoading,
    refetch: fetchComplaints,
    createComplaint,
    updateComplaint,
    resolveComplaint,
    deleteComplaint,
    stats,
  };
}
