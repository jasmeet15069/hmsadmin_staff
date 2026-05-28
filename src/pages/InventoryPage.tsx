import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerishableForecast } from '@/components/inventory/PerishableForecast';
import { useInventory } from '@/hooks/useInventory';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import { formatCurrency, getCountryOption } from '@/lib/currency';
import { Plus, Search, AlertTriangle, Package, TrendingDown, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const { items, isLoading, lowStockItems, expiringItems, createItem, deleteItem, refetch } = useInventory();
  const { branding } = useHotelBranding();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '', unit: 'kg', current_stock: 0, min_stock: 0,
    cost_per_unit: 0, supplier: '', is_perishable: false, expiry_date: '',
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !showLowStock || Number(item.current_stock) < Number(item.min_stock);
    return matchesSearch && matchesFilter;
  });

  const getStockLevel = (current: number, min: number) => {
    if (min <= 0) return { level: 'good', color: 'bg-green-500' };
    const ratio = current / min;
    if (ratio < 0.5) return { level: 'critical', color: 'bg-destructive' };
    if (ratio < 1) return { level: 'low', color: 'bg-amber-500' };
    return { level: 'good', color: 'bg-green-500' };
  };
  const currencyOption = getCountryOption(branding.country, branding.currency);
  const money = (amount: number) => formatCurrency(amount, currencyOption);

  const handleAddItem = async () => {
    const success = await createItem({
      name: newItem.name,
      unit: newItem.unit,
      current_stock: newItem.current_stock,
      min_stock: newItem.min_stock,
      cost_per_unit: newItem.cost_per_unit || null,
      supplier: newItem.supplier || null,
      is_perishable: newItem.is_perishable,
      expiry_date: newItem.expiry_date || null,
    });
    if (success) {
      setAddOpen(false);
      setNewItem({ name: '', unit: 'kg', current_stock: 0, min_stock: 0, cost_per_unit: 0, supplier: '', is_perishable: false, expiry_date: '' });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
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
            <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
            <p className="text-muted-foreground">
              {items.length} items - {lowStockItems.length} low stock alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh inventory" title="Refresh inventory">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="border-2 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unit</Label>
                    <Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="border-2 mt-1" />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Input value={newItem.supplier} onChange={e => setNewItem({ ...newItem, supplier: e.target.value })} className="border-2 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Current Stock</Label>
                    <Input type="number" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: +e.target.value })} className="border-2 mt-1" />
                  </div>
                  <div>
                    <Label>Min Stock</Label>
                    <Input type="number" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: +e.target.value })} className="border-2 mt-1" />
                  </div>
                  <div>
                    <Label>Cost/Unit</Label>
                    <Input type="number" step="0.01" value={newItem.cost_per_unit} onChange={e => setNewItem({ ...newItem, cost_per_unit: +e.target.value })} className="border-2 mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newItem.is_perishable} onCheckedChange={v => setNewItem({ ...newItem, is_perishable: v })} />
                  <Label>Perishable</Label>
                </div>
                {newItem.is_perishable && (
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="date" value={newItem.expiry_date} onChange={e => setNewItem({ ...newItem, expiry_date: e.target.value })} className="border-2 mt-1" />
                  </div>
                )}
                <Button className="w-full" onClick={handleAddItem} disabled={!newItem.name || !newItem.unit}>
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="border-2">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="mr-2 h-4 w-4" />
              All Items
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingDown className="mr-2 h-4 w-4" />
              FIFO Forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-6">
            <PerishableForecast items={items} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            {/* Alerts */}
            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {lowStockItems.length > 0 && (
                  <div className="flex items-start gap-3 border-2 border-amber-500 bg-amber-50 p-4">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="font-bold text-amber-800">Low Stock Alert</h4>
                      <p className="text-sm text-amber-700">
                        {lowStockItems.length} items below minimum
                      </p>
                      <ul className="mt-2 text-sm text-amber-700">
                        {lowStockItems.slice(0, 3).map(item => (
                          <li key={item.id}>- {item.name}: {Number(item.current_stock)}/{Number(item.min_stock)} {item.unit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {expiringItems.length > 0 && (
                  <div className="flex items-start gap-3 border-2 border-destructive bg-destructive/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <h4 className="font-bold text-destructive">Expiring Soon</h4>
                      <p className="text-sm text-destructive/80">
                        {expiringItems.length} perishable items expiring within 3 days
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search inventory..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border-2 pl-9" />
              </div>
              <Button variant={showLowStock ? 'default' : 'outline'} onClick={() => setShowLowStock(!showLowStock)}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Low Stock Only
              </Button>
            </div>

            {/* Inventory Table */}
            <div className="border-2 border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Min Required</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const stock = getStockLevel(Number(item.current_stock), Number(item.min_stock));
                    const daysUntilExpiry = item.expiry_date
                      ? Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <TableRow key={item.id} className="border-b">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.is_perishable && (
                                <p className="text-xs text-muted-foreground">
                                  Perishable - tracked for FIFO
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.unit || 'unit'}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-bold">{Number(item.current_stock)}</span>{' '}
                          <span className="text-muted-foreground">{item.unit}</span>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={Number(item.min_stock) > 0 ? Math.min((Number(item.current_stock) / Number(item.min_stock)) * 100, 100) : 100} className={cn('h-2', stock.color)} />
                            <p className="mt-1 text-xs text-muted-foreground">{Number(item.min_stock)} {item.unit}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {stock.level !== 'good' && (
                              <Badge variant={stock.level === 'critical' ? 'destructive' : 'secondary'}>
                                {stock.level === 'critical' ? 'Critical' : 'Low Stock'}
                              </Badge>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
                              <Badge variant="destructive">
                                {daysUntilExpiry <= 0 ? 'Expired' : `Expires in ${daysUntilExpiry}d`}
                              </Badge>
                            )}
                            {stock.level === 'good' && (!daysUntilExpiry || daysUntilExpiry > 3) && (
                              <Badge variant="outline" className="border-green-600 text-green-600">In Stock</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                        <TableCell>
                          {item.is_perishable && item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                          {item.cost_per_unit ? (
                            <p className="text-xs text-muted-foreground">{money(Number(item.cost_per_unit))}/unit</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
