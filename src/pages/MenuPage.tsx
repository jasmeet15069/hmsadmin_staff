import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMenu } from '@/hooks/useMenu';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type MenuItem = ReturnType<typeof useMenu>['items'][number];
type CustomizationForm = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

const blankForm = {
  name: '',
  description: '',
  price: 0,
  category_id: '',
  is_available: true,
  preparation_time: 10,
};

const defaultCustomizations: CustomizationForm[] = [
  { id: 'extra-seasoning', name: 'Extra seasoning', price: 0, is_available: true },
  { id: 'extra-sauce', name: 'Extra sauce', price: 0, is_available: true },
  { id: 'extra-fries', name: 'Extra fries', price: 0, is_available: true },
];

const COUNTRY_OPTIONS = [
  { country: 'United States', currency: 'USD', locale: 'en-US' },
  { country: 'India', currency: 'INR', locale: 'en-IN' },
  { country: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { country: 'European Union', currency: 'EUR', locale: 'de-DE' },
  { country: 'United Arab Emirates', currency: 'AED', locale: 'en-AE' },
  { country: 'Canada', currency: 'CAD', locale: 'en-CA' },
  { country: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { country: 'Singapore', currency: 'SGD', locale: 'en-SG' },
  { country: 'Japan', currency: 'JPY', locale: 'ja-JP' },
  { country: 'South Korea', currency: 'KRW', locale: 'ko-KR' },
];

export default function MenuPage() {
  const { branding } = useHotelBranding();
  const { items, categories, isLoading, refetch, createItem, updateItem, deleteItem } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [selectedCountryName, setSelectedCountryName] = useState(COUNTRY_OPTIONS[0].country);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationForm[]>(defaultCustomizations);

  const selectedCountry = COUNTRY_OPTIONS.find(option => option.country === selectedCountryName) || COUNTRY_OPTIONS[0];

  useEffect(() => {
    const option =
      COUNTRY_OPTIONS.find(item => item.country === branding.country) ||
      COUNTRY_OPTIONS.find(item => item.currency === branding.currency);
    if (option) setSelectedCountryName(option.country);
  }, [branding.country, branding.currency]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.menu_categories?.name || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  useEffect(() => {
    let cancelled = false;

    if (selectedCountry.currency === 'USD') {
      setExchangeRate(1);
      setIsRateLoading(false);
      setRateError(null);
      return;
    }

    setIsRateLoading(true);
    setRateError(null);
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/exchange-rate?base=USD&target=${selectedCountry.currency}`)
      .then(response => response.json())
      .then(payload => {
        if (cancelled) return;
        if (payload.error) throw new Error(payload.error);
        setExchangeRate(Number(payload.data.rate));
      })
      .catch(() => {
        if (cancelled) return;
        setExchangeRate(1);
        setRateError('Live rate unavailable. Saving as USD.');
      })
      .finally(() => {
        if (!cancelled) setIsRateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountry.currency]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const openNewItem = () => {
    setEditingItem(null);
    setForm({ ...blankForm, category_id: categories[0]?.id || '' });
    setCustomizations(defaultCustomizations);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      category_id: item.category_id || '',
      is_available: item.is_available,
      preparation_time: item.preparation_time,
    });
    setCustomizations(
      item.menu_item_customizations && item.menu_item_customizations.length > 0
        ? item.menu_item_customizations.map(option => ({
            id: option.id,
            name: option.name,
            price: Number(option.price),
            is_available: option.is_available,
          }))
        : defaultCustomizations
    );
    setSelectedCountryName(COUNTRY_OPTIONS[0].country);
    setIsDialogOpen(true);
  };

  const customizationUsdPrice = (price: number) =>
    Number((selectedCountry.currency === 'USD' ? price : price / exchangeRate).toFixed(2));

  const syncCustomizations = async (itemId: string) => {
    await supabase.from('menu_item_customizations').delete().eq('menu_item_id', itemId);
    const rows = customizations
      .filter(option => option.name.trim())
      .map(option => ({
        menu_item_id: itemId,
        name: option.name.trim(),
        price: customizationUsdPrice(Number(option.price) || 0),
        is_available: option.is_available,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('menu_item_customizations').insert(rows);
      if (error) throw error;
    }
  };

  const addCustomization = () => {
    setCustomizations(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, name: '', price: 0, is_available: true },
    ]);
  };

  const updateCustomization = (id: string, updates: Partial<CustomizationForm>) => {
    setCustomizations(prev => prev.map(option => option.id === id ? { ...option, ...updates } : option));
  };

  const removeCustomization = (id: string) => {
    setCustomizations(prev => prev.filter(option => option.id !== id));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const usdPrice = selectedCountry.currency === 'USD' ? Number(form.price) : Number(form.price) / exchangeRate;
    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(usdPrice.toFixed(2)),
      category_id: form.category_id || null,
      is_available: form.is_available,
      preparation_time: Number(form.preparation_time),
    };
    try {
      const result = editingItem
        ? await updateItem(editingItem.id, payload)
        : await createItem(payload);

      if (result) {
        const itemId = editingItem?.id || (typeof result === 'object' ? (result as { id?: string }).id : null);
        if (itemId) await syncCustomizations(itemId);
        await refetch();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error saving customizations:', error);
    }
  };

  const formatMoney = (amount: number, currency = selectedCountry.currency) =>
    new Intl.NumberFormat(selectedCountry.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    }).format(amount);

  const toggleAvailability = (item: MenuItem) => {
    updateItem(item.id, { is_available: !item.is_available });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Menu Management</h2>
            <p className="text-muted-foreground">
              {items.length} items | {items.filter(i => i.is_available).length} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh menu" title="Refresh menu">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 sm:max-w-2xl lg:max-w-3xl">
                <DialogHeader className="pr-8">
                  <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSave}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input id="name" className="border-2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" className="border-2" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="price">Price ({selectedCountry.currency})</Label>
                      <Input id="price" type="number" step="0.01" className="border-2" value={form.price} onChange={event => setForm({ ...form, price: Number(event.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="prep_time">Prep Time (min)</Label>
                      <Input id="prep_time" type="number" className="border-2" value={form.preparation_time} onChange={event => setForm({ ...form, preparation_time: Number(event.target.value) })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Country / Currency</Label>
                      <Select value={selectedCountryName} onValueChange={setSelectedCountryName}>
                        <SelectTrigger className="border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map(option => (
                            <SelectItem key={option.country} value={option.country}>
                              {option.country} ({option.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Live rate</span>
                        <span>{isRateLoading ? 'Loading...' : `1 USD = ${exchangeRate.toFixed(4)} ${selectedCountry.currency}`}</span>
                      </div>
                      {rateError && <p className="mt-1 text-xs text-destructive">{rateError}</p>}
                      {selectedCountry.currency !== 'USD' && !isRateLoading && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stores as {formatMoney(Number(form.price) / exchangeRate, 'USD')} base USD.
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Category</Label>
                      <Select value={form.category_id || 'none'} onValueChange={value => setForm({ ...form, category_id: value === 'none' ? '' : value })}>
                        <SelectTrigger className="border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Customization Options</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addCustomization}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {customizations.map(option => (
                          <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_88px_44px_44px] gap-2 max-[520px]:grid-cols-[minmax(0,1fr)_44px_44px]">
                            <Input
                              className="min-w-0 border-2 max-[520px]:col-span-3"
                              value={option.name}
                              placeholder="Extra sauce"
                              onChange={event => updateCustomization(option.id, { name: event.target.value })}
                            />
                            <Input
                              className="border-2"
                              type="number"
                              step="0.01"
                              value={option.price}
                              aria-label={`Price for ${option.name || 'customization'}`}
                              onChange={event => updateCustomization(option.id, { price: Number(event.target.value) })}
                            />
                            <Button
                              type="button"
                              variant={option.is_available ? 'default' : 'outline'}
                              size="icon"
                              aria-label={option.is_available ? 'Hide option' : 'Show option'}
                              title={option.is_available ? 'Hide option' : 'Show option'}
                              onClick={() => updateCustomization(option.id, { is_available: !option.is_available })}
                            >
                              {option.is_available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label="Remove customization option"
                              title="Remove customization option"
                              onClick={() => removeCustomization(option.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={form.is_available ? 'default' : 'outline'}
                    className="w-full justify-center"
                    onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  >
                    {form.is_available ? (
                      <Eye className="mr-2 h-4 w-4" />
                    ) : (
                      <EyeOff className="mr-2 h-4 w-4" />
                    )}
                    {form.is_available ? 'Visible to guests' : 'Hidden from guests'}
                  </Button>
                  <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row">
                    <Button type="submit" className="flex-1" disabled={!form.name || Number(form.price) <= 0 || isRateLoading}>
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </Button>
                    <Button type="button" variant="outline" className="sm:w-28" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="mb-4 text-lg font-bold">{category}</h3>
              <div className="space-y-3">
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    className={`grid gap-4 border-2 p-4 transition-all md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                      !item.is_available ? 'border-muted bg-muted/50 opacity-60' : 'border-border'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-bold">{item.name}</h4>
                        {!item.is_available && (
                          <span className="bg-muted px-2 py-0.5 text-xs font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description || 'No description'}</p>
                      <p className="mt-1 text-sm">
                        <span className="font-medium">${Number(item.price).toFixed(2)}</span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{item.preparation_time} min prep</span>
                      </p>
                      {item.menu_item_customizations && item.menu_item_customizations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.menu_item_customizations.filter(option => option.is_available).map(option => (
                            <span key={option.id} className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {option.name}{Number(option.price) > 0 ? ` +$${Number(option.price).toFixed(2)}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2">
                      <Button
                        variant={item.is_available ? 'default' : 'outline'}
                        size="sm"
                        className="w-28"
                        onClick={() => toggleAvailability(item)}
                        aria-label={item.is_available ? 'Hide menu item' : 'Show menu item'}
                        title={item.is_available ? 'Hide menu item' : 'Show menu item'}
                      >
                        {item.is_available ? (
                          <Eye className="mr-2 h-4 w-4" />
                        ) : (
                          <EyeOff className="mr-2 h-4 w-4" />
                        )}
                        {item.is_available ? 'Visible' : 'Hidden'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Edit menu item"
                        title="Edit menu item"
                        onClick={() => openEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" aria-label="Delete menu item" title="Delete menu item" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              No menu items found
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
