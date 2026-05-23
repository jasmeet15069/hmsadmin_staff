import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type OrderInsert = TablesInsert<'orders'>;
type OrderItemInsert = TablesInsert<'order_items'>;

interface OrderWithDetails extends Order {
  order_items?: (OrderItem & { menu_items?: { name: string } | null })[];
  rooms?: { room_number: string } | null;
  guest_stays?: { guest_name: string } | null;
}

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name)), rooms(room_number), guest_stays(guest_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders-all-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const createOrder = async (
    order: Omit<OrderInsert, 'order_number'>,
    items: Omit<OrderItemInsert, 'order_id'>[]
  ) => {
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({ ...order, order_number: orderNumber })
      .select()
      .single();

    if (orderError) {
      toast({ title: 'Error', description: orderError.message, variant: 'destructive' });
      return null;
    }

    const orderItems = items.map(item => ({
      ...item,
      order_id: orderData.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      toast({ title: 'Error', description: itemsError.message, variant: 'destructive' });
      return null;
    }

    toast({ title: 'Success', description: `Order ${orderNumber} created successfully` });
    await fetchOrders();
    return orderData;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const updates: Partial<Order> = { status };
    
    if (status === 'picked_up') {
      updates.pickup_time = new Date().toISOString();
    } else if (status === 'delivered') {
      updates.delivery_time = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: `Order status updated to ${status}` });
    await fetchOrders();
    return true;
  };

  const deleteOrder = async (orderId: string) => {
    const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', orderId);
    if (itemsError) {
      toast({ title: 'Error', description: itemsError.message, variant: 'destructive' });
      return false;
    }

    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Order deleted successfully' });
    await fetchOrders();
    return true;
  };

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    totalToday: orders.filter(o => 
      new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length,
    revenueToday: orders
      .filter(o => 
        new Date(o.created_at).toDateString() === new Date().toDateString() &&
        o.status !== 'cancelled'
      )
      .reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  return {
    orders,
    isLoading,
    refetch: fetchOrders,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    stats,
  };
}
