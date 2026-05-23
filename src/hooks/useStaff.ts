import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

interface StaffMember extends Profile {
  roles: UserRole[];
  currentShift?: Tables<'staff_shifts'> | null;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStaff = useCallback(async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get active shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('staff_shifts')
        .select('*')
        .is('clock_out', null);

      if (shiftsError) throw shiftsError;

      // Filter to only staff members (non-guests)
      const staffRoles = ['super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter'];
      const staffUserIds = roles
        ?.filter(r => staffRoles.includes(r.role))
        .map(r => r.user_id) || [];

      const staffMembers = profiles
        ?.filter(p => staffUserIds.includes(p.user_id))
        .map(p => ({
          ...p,
          roles: roles?.filter(r => r.user_id === p.user_id) || [],
          currentShift: shifts?.find(s => s.user_id === p.user_id) || null,
        })) || [];

      setStaff(staffMembers);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({ title: 'Error', description: 'Failed to fetch staff', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const updateProfile = async (userId: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Profile updated successfully' });
    await fetchStaff();
    return true;
  };

  const onDutyCount = staff.filter(s => s.currentShift).length;

  return {
    staff,
    isLoading,
    refetch: fetchStaff,
    updateProfile,
    onDutyCount,
  };
}
