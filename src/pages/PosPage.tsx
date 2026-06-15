import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Plus, Minus, Trash2, ShoppingCart, Send, Loader2,
  CreditCard, Smartphone, DoorOpen, Table2, Utensils, Landmark,
  ChefHat, Clock, CheckCircle2, Printer, Receipt, LayoutGrid, List
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type MenuItem = Tables<'menu_items'>;
type MenuCategory = Tables<'menu_categories'>;

interface MenuItemWithCategory extends MenuItem {
  menu_categories?: { name: string } | null;
}

interface CartItem {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

const TAX_RATE = 0.18;

const statusConfig: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'border-green-500 bg-green-500/10 text-green-700' },
  occupied: { label: 'Occupied', className: 'border-amber-500 bg-amber-500/10 text-amber-700' },
  maintenance: { label: 'Maintenance', className: 'border-blue-500 bg-blue-500/10 text-blue-700' },
  cleaning: { label: 'Cleaning', className: 'border-blue-500 bg-blue-500/10 text-blue-700' },
};

export default function PosPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('pos');
  const [tables, setTables] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [chargeRoomNumber, setChargeRoomNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isKdsOpen, setIsKdsOpen] = useState(false);
  const [kdsOrders, setKdsOrders] = useState<any[]>([]);
  const [kdsFilter, setKdsFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [tablesRes, itemsRes, categoriesRes] = await Promise.all([
        supabase.from('rooms').select('*').order('room_number'),
        supabase.from('menu_items').select('*, menu_categories(name)').eq('is_available', true).order('name'),
        supabase.from('menu_categories').select('*').order('display_order'),
      ]);
      if (tablesRes.error) throw tablesRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      setTables(tablesRes.data || []);
      setMenuItems(itemsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load POS data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKdsOrders = async () => {
    const { data } = await supabase.from('orders').select('*').in('status', kdsFilter === 'all' ? ['pending', 'preparing'] : [kdsFilter]).order('created_at', { ascending: false }).limit(20) as any;
    setKdsOrders(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredItems = menuItems.filter(item => !selectedCategory || item.category_id === selectedCategory);
  const selectedTableData = tables.find(t => t.id === selectedTable);

  const addToCart = (item: MenuItemWithCategory) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menu_item_id === item.id);
      if (existing) return prev.map(ci => ci.menu_item_id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      return [...prev, { menu_item_id: item.id, name: item.name, unit_price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.menu_item_id !== menuItemId) return ci;
      const newQty = ci.quantity + delta;
      if (newQty <= 0) return ci;
      return { ...ci, quantity: newQty };
    }).filter(ci => ci.quantity > 0));
  };

  const removeFromCart = (menuItemId: string) => setCart(prev => prev.filter(ci => ci.menu_item_id !== menuItemId));

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const clearCart = () => { setCart([]); setPaymentMethod('Cash'); setChargeRoomNumber(''); };

  const handleSendToKitchen = async () => {
    if (!selectedTable || cart.length === 0) return;
    if (paymentMethod === 'Room Charge' && !chargeRoomNumber) {
      toast({ title: 'Error', description: 'Please select a room for room charge', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const orderNumber = `POS-${Date.now()}`;
      const roomId = paymentMethod === 'Room Charge' && chargeRoomNumber
        ? tables.find(r => r.room_number === chargeRoomNumber)?.id || selectedTable : selectedTable;
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        order_number: orderNumber, room_id: roomId, status: 'pending', total_amount: Number(total.toFixed(2)),
      } as any).select().single();
      if (orderError) throw orderError;
      const orderItems = cart.map(item => ({ order_id: orderData.id, menu_item_id: item.menu_item_id, quantity: item.quantity, unit_price: item.unit_price }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', selectedTable);
      toast({ title: 'Success', description: `Order ${orderNumber} sent to kitchen` });
      clearCart();
      const { data: updatedTables } = await supabase.from('rooms').select('*').order('room_number');
      if (updatedTables) setTables(updatedTables);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create order', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  const handlePayment = () => {
    if (!selectedTable || cart.length === 0) return;
    setIsPaymentOpen(true);
  };

  const processPayment = () => {
    handleSendToKitchen();
    setIsPaymentOpen(false);
    toast({ title: 'Payment processed', description: `${paymentMethod}: ₹${total.toFixed(2)}` });
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">POS & Restaurant</h2>
            <p className="text-muted-foreground">Order entry, kitchen display, and table management</p>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pos"><Utensils className="h-4 w-4 mr-1" /> POS</TabsTrigger>
              <TabsTrigger value="kds"><ChefHat className="h-4 w-4 mr-1" /> KDS</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === 'pos' && (
          <div className="flex h-[calc(100vh-12rem)] gap-3">
            {/* Tables */}
            <div className="flex w-[35%] flex-col rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Table2 className="h-5 w-5" /><h3 className="font-bold">Tables</h3></div>
                <Badge variant="outline">{tables.length} total</Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 gap-2">
                  {tables.map(table => {
                    const config = statusConfig[table.status] || statusConfig.available;
                    return (
                      <button key={table.id} onClick={() => setSelectedTable(table.id)}
                        className={cn('flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all hover:shadow-md', config.className, selectedTable === table.id && 'ring-2 ring-primary ring-offset-2')}>
                        <span className="text-lg font-bold">{table.room_number}</span>
                        <span className="text-xs">{config.label}</span>
                        <span className="text-xs text-muted-foreground">{table.capacity} seats</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              {selectedTable && <Button className="mt-3" size="sm" onClick={clearCart}><Plus className="mr-1 h-4 w-4" />New Order</Button>}
            </div>

            {/* Menu */}
            <div className="flex w-[40%] flex-col rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center gap-2"><Utensils className="h-5 w-5" /><h3 className="font-bold">Menu</h3></div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
                {categories.map(cat => (
                  <Button key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat.id)}>{cat.name}</Button>
                ))}
              </div>
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  {filteredItems.map(item => (
                    <div key={item.id} className="flex flex-col justify-between rounded-lg border p-2.5">
                      <div><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">₹{Number(item.price).toFixed(2)}</p></div>
                      <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => addToCart(item)} disabled={!selectedTable}>
                        <Plus className="mr-1 h-3 w-3" />Add
                      </Button>
                    </div>
                  ))}
                  {filteredItems.length === 0 && <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">No items found</div>}
                </div>
              </ScrollArea>
            </div>

            {/* Order */}
            <div className="flex w-[25%] flex-col rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center gap-2"><ShoppingCart className="h-5 w-5" /><h3 className="font-bold">Order</h3></div>
              {selectedTable ? (
                <>
                  <div className="mb-3 rounded-md bg-muted p-2 text-sm">Table: <span className="font-bold">{selectedTableData?.room_number}</span> ({selectedTableData?.capacity} seats)</div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {cart.map(item => (
                        <div key={item.menu_item_id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                          <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-muted-foreground">₹{item.unit_price.toFixed(2)} ea</p></div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menu_item_id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="flex w-6 items-center justify-center text-sm font-medium">{item.quantity}</span>
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menu_item_id, 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <span className="w-16 text-right text-sm font-medium">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeFromCart(item.menu_item_id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      {cart.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Select a table and add items</p>}
                    </div>
                  </ScrollArea>
                  {cart.length > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
                      <div className="flex justify-between text-base font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Payment</p>
                        <div className="grid grid-cols-2 gap-1">
                          {[{ value: 'Cash', icon: Landmark }, { value: 'Card', icon: CreditCard }, { value: 'UPI', icon: Smartphone }, { value: 'Room Charge', icon: DoorOpen }].map(({ value, icon: Icon }) => (
                            <Button key={value} variant={paymentMethod === value ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setPaymentMethod(value)}>
                              <Icon className="mr-1 h-3 w-3" />{value}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {paymentMethod === 'Room Charge' && (
                        <Select value={chargeRoomNumber} onValueChange={setChargeRoomNumber}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select room..." /></SelectTrigger>
                          <SelectContent>{tables.filter(r => r.status === 'occupied').map(r => (<SelectItem key={r.id} value={r.room_number}>Room {r.room_number}</SelectItem>))}</SelectContent>
                        </Select>
                      )}
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleSendToKitchen} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send to Kitchen
                        </Button>
                        <Button variant="secondary" onClick={handlePayment}><CreditCard className="mr-2 h-4 w-4" />Pay</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center"><Table2 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Select a table to start</p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KDS Tab */}
        {tab === 'kds' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={kdsFilter} onValueChange={v => { setKdsFilter(v); fetchKdsOrders(); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchKdsOrders}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kdsOrders.slice(0, 12).map(order => (
                <Card key={order.id} className={cn('border-2', order.status === 'pending' ? 'border-amber-400' : 'border-blue-400')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-mono">{order.order_number}</CardTitle>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                      <Badge variant={order.status === 'pending' ? 'destructive' : 'default'}>{order.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">Table: {order.room_id ? tables.find(t => t.id === order.room_id)?.room_number || 'N/A' : 'N/A'}</p>
                    <div className="mt-2 flex gap-2">
                      {order.status === 'pending' && <Button size="sm" onClick={async () => { await supabase.from('orders').update({ status: 'preparing' } as any).eq('id', order.id); fetchKdsOrders(); }}><ChefHat className="h-3 w-3 mr-1" />Start</Button>}
                      {order.status === 'preparing' && <Button size="sm" variant="secondary" onClick={async () => { await supabase.from('orders').update({ status: 'ready' } as any).eq('id', order.id); fetchKdsOrders(); }}><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Button>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {kdsOrders.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No active orders in kitchen</div>}
            </div>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Process Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold"><span>Total Amount</span><span>₹{total.toFixed(2)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'Card', 'UPI', 'Wallet'].map(m => (
                    <Button key={m} variant={paymentMethod === m ? 'default' : 'outline'} onClick={() => setPaymentMethod(m)}>{m}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Amount Tendered</Label>
                <Input type="number" value={total.toFixed(2)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
              <Button onClick={processPayment}><Receipt className="mr-2 h-4 w-4" />Process Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
function RefreshCw(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>; }