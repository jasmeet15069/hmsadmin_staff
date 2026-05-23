import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Payment = Tables<'payments'>;
type PaymentInsert = TablesInsert<'payments'>;

interface PaymentWithDetails extends Payment {
  orders?: { order_number: string } | null;
  guest_stays?: { guest_name: string; rooms?: { room_number: string } | null } | null;
}

interface PaymentSettings {
  id: string;
  gateway_name: string;
  webhook_url: string | null;
  is_active: boolean;
}

export function usePayments(filterByGuest = false) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    try {
      let query = supabase
        .from('payments')
        .select('*, orders(order_number), guest_stays(guest_name, rooms(room_number))')
        .order('created_at', { ascending: false });

      if (filterByGuest && user?.id) {
        query = query.eq('guest_stays.guest_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterByGuest, user?.id]);

  const fetchPaymentSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .order('gateway_name');

      if (error) throw error;
      setPaymentSettings(data || []);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchPaymentSettings();

    const channel = supabase
      .channel('payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments, fetchPaymentSettings]);

  const createPayment = async (payment: PaymentInsert) => {
    const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;
    const { error } = await supabase
      .from('payments')
      .insert({ ...payment, payment_number: paymentNumber });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Payment recorded successfully' });
    await fetchPayments();
    return true;
  };

  const updatePaymentSettings = async (id: string, updates: Partial<PaymentSettings>) => {
    const { error } = await supabase
      .from('payment_settings')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Payment settings updated' });
    await fetchPaymentSettings();
    return true;
  };

  const stats = {
    total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
  };

  return {
    payments,
    paymentSettings,
    isLoading,
    refetch: fetchPayments,
    createPayment,
    updatePaymentSettings,
    stats,
  };
}
