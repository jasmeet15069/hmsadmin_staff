import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
type InventoryInsert = TablesInsert<'inventory_items'>;
type InventoryUpdate = TablesUpdate<'inventory_items'>;

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({ title: 'Error', description: 'Failed to fetch inventory', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const createItem = async (item: InventoryInsert) => {
    const { error } = await supabase.from('inventory_items').insert(item);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Item added successfully' });
    await fetchItems();
    return true;
  };

  const updateItem = async (id: string, updates: InventoryUpdate) => {
    const { error } = await supabase.from('inventory_items').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Item updated successfully' });
    await fetchItems();
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Item deleted successfully' });
    await fetchItems();
    return true;
  };

  const lowStockItems = items.filter(i => i.current_stock < i.min_stock);
  const expiringItems = items.filter(i => {
    if (!i.expiry_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3;
  });

  return {
    items,
    isLoading,
    refetch: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    lowStockItems,
    expiringItems,
  };
}
