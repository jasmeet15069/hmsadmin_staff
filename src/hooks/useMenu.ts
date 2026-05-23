import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type MenuItem = Tables<'menu_items'>;
type MenuCategory = Tables<'menu_categories'>;
type MenuCustomization = Tables<'menu_item_customizations'>;
type MenuItemInsert = TablesInsert<'menu_items'>;
type MenuItemUpdate = TablesUpdate<'menu_items'>;

interface MenuItemWithCategory extends MenuItem {
  menu_categories?: { name: string } | null;
  menu_item_customizations?: MenuCustomization[];
}

export function useMenu() {
  const [items, setItems] = useState<MenuItemWithCategory[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMenu = useCallback(async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*, menu_categories(name), menu_item_customizations(*)')
          .order('name'),
        supabase
          .from('menu_categories')
          .select('*')
          .order('display_order'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setItems(itemsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast({ title: 'Error', description: 'Failed to fetch menu', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const createItem = async (item: MenuItemInsert) => {
    const { data, error } = await supabase.from('menu_items').insert(item).single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Menu item created' });
    await fetchMenu();
    return data;
  };

  const updateItem = async (id: string, updates: MenuItemUpdate) => {
    const { error } = await supabase.from('menu_items').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Menu item updated' });
    await fetchMenu();
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Menu item deleted' });
    await fetchMenu();
    return true;
  };

  return {
    items,
    categories,
    isLoading,
    refetch: fetchMenu,
    createItem,
    updateItem,
    deleteItem,
  };
}
