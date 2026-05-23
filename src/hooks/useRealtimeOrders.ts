import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderStatus = Order['status'];

export function useRealtimeOrders(filterByGuest = false) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterByGuest && user?.id) {
        query = query.eq('guest_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filterByGuest]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            if (!filterByGuest || newOrder.guest_id === user?.id) {
              setOrders(prev => [newOrder, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders(prev =>
              prev.map(order => (order.id === updatedOrder.id ? updatedOrder : order))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order;
            setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, user?.id, filterByGuest]);

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Order Received',
      confirmed: 'Confirmed',
      preparing: 'Being Prepared',
      ready: 'Ready for Pickup',
      picked_up: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status];
  };

  const getStatusProgress = (status: OrderStatus) => {
    const progressMap: Record<OrderStatus, number> = {
      pending: 15,
      confirmed: 30,
      preparing: 50,
      ready: 70,
      picked_up: 85,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status];
  };

  return {
    orders,
    isLoading,
    refetch: fetchOrders,
    getStatusLabel,
    getStatusProgress,
  };
}
