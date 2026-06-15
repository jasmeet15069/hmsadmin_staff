import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerishableForecast } from '@/components/inventory/PerishableForecast';
import { useInventory } from '@/hooks/useInventory';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import { formatCurrency, getCountryOption } from '@/lib/currency';
import { Plus, Search, AlertTriangle, Package, TrendingDown, Loader2, Trash2, RefreshCw, ClipboardList, Truck, ArrowRightLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const { items, isLoading, lowStockItems, expiringItems, createItem, deleteItem, refetch } = useInventory();
  const { branding } = useHotelBranding();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState('inventory');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '', unit: 'kg', current_stock: 0, min_stock: 0,
    cost_per_unit: 0, supplier: '', is_perishable: false, expiry_date: '',
  });

  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [isPrOpen, setIsPrOpen] = useState(false);
  const [newPr, setNewPr] = useState({ item_name: '', quantity: 0, urgency: 'normal', notes: '' });

  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [newGrn, setNewGrn] = useState({ item_name: '', quantity: 0, received_from: '', notes: '' });

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({ from: '', to: '', item_name: '', quantity: 0 });

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

  const handleCreatePr = async () => {
    setPurchaseRequests(prev => [...prev, { ...newPr, id: Date.now().toString(), status: 'pending', created_at: new Date().toISOString() }]);
    setIsPrOpen(false);
    setNewPr({ item_name: '', quantity: 0, urgency: 'normal', notes: '' });
  };

  const handleCreateGrn = async () => {
    setIsGrnOpen(false);
    setNewGrn({ item_name: '', quantity: 0, received_from: '', notes: '' });
  };

  const handleCreateTransfer = async () => {
    setIsTransferOpen(false);
    setNewTransfer({ from: '', to: '', item_name: '', quantity: 0 });
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
              {items.length} items · {lowStockItems.length} low stock alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh inventory" title="Refresh inventory">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            {tab === 'inventory' && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button></DialogTrigger>
                <DialogContent className="border-2">
                  <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="border-2 mt-1" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="border-2 mt-1" /></div>
                      <div><Label>Supplier</Label><Input value={newItem.supplier} onChange={e => setNewItem({ ...newItem, supplier: e.target.value })} className="border-2 mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>Current Stock</Label><Input type="number" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: +e.target.value })} className="border-2 mt-1" /></div>
                      <div><Label>Min Stock</Label><Input type="number" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: +e.target.value })} className="border-2 mt-1" /></div>
                      <div><Label>Cost/Unit</Label><Input type="number" step="0.01" value={newItem.cost_per_unit} onChange={e => setNewItem({ ...newItem, cost_per_unit: +e.target.value })} className="border-2 mt-1" /></div>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={newItem.is_perishable} onCheckedChange={v => setNewItem({ ...newItem, is_perishable: v })} /><Label>Perishable</Label></div>
                    {newItem.is_perishable && <div><Label>Expiry Date</Label><Input type="date" value={newItem.expiry_date} onChange={e => setNewItem({ ...newItem, expiry_date: e.target.value })} className="border-2 mt-1" /></div>}
                    <Button className="w-full" onClick={handleAddItem} disabled={!newItem.name || !newItem.unit}>Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {tab === 'purchase-requests' && <Button onClick={() => setIsPrOpen(true)}><ClipboardList className="mr-2 h-4 w-4" /> New Request</Button>}
            {tab === 'grn' && <Button onClick={() => setIsGrnOpen(true)}><FileText className="mr-2 h-4 w-4" /> Record Receipt</Button>}
            {tab === 'transfers' && <Button onClick={() => setIsTransferOpen(true)}><ArrowRightLeft className="mr-2 h-4 w-4" /> New Transfer</Button>}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="border-2">
            <TabsTrigger value="inventory"><Package className="mr-2 h-4 w-4" /> All Items</TabsTrigger>
            <TabsTrigger value="purchase-requests"><ClipboardList className="mr-2 h-4 w-4" /> Purchase Requests</TabsTrigger>
            <TabsTrigger value="grn"><FileText className="mr-2 h-4 w-4" /> GRN</TabsTrigger>
            <TabsTrigger value="transfers"><ArrowRightLeft className="mr-2 h-4 w-4" /> Stock Transfers</TabsTrigger>
            <TabsTrigger value="forecast"><TrendingDown className="mr-2 h-4 w-4" /> FIFO Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {lowStockItems.length > 0 && (
              <div className="flex items-start gap-3 border-2 border-amber-500 bg-amber-50 p-4">
                <TrendingDown className="h-5 w-5 text-amber-600" />
                <div>
                  <h4 className="font-bold text-amber-800">Low Stock Alert</h4>
                  <p className="text-sm text-amber-700">{lowStockItems.length} items below minimum</p>
                </div>
              </div>
            )}

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
                              {item.is_perishable && <p className="text-xs text-muted-foreground">Perishable</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.unit || 'unit'}</TableCell>
                        <TableCell><span className="font-mono font-bold">{Number(item.current_stock)}</span> <span className="text-muted-foreground">{item.unit}</span></TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={Number(item.min_stock) > 0 ? Math.min((Number(item.current_stock) / Number(item.min_stock)) * 100, 100) : 100} className={cn('h-2', stock.color)} />
                            <p className="mt-1 text-xs text-muted-foreground">{Number(item.min_stock)} {item.unit}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {stock.level !== 'good' && <Badge variant={stock.level === 'critical' ? 'destructive' : 'secondary'}>{stock.level === 'critical' ? 'Critical' : 'Low Stock'}</Badge>}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 3 && <Badge variant="destructive">{daysUntilExpiry <= 0 ? 'Expired' : `Expires in ${daysUntilExpiry}d`}</Badge>}
                            {stock.level === 'good' && (!daysUntilExpiry || daysUntilExpiry > 3) && <Badge variant="outline" className="border-green-600 text-green-600">In Stock</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                        <TableCell>
                          {item.is_perishable && item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                          {item.cost_per_unit ? <p className="text-xs text-muted-foreground">{money(Number(item.cost_per_unit))}/unit</p> : null}
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
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No inventory items found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="purchase-requests" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No purchase requests</TableCell></TableRow>
                    ) : purchaseRequests.map(pr => (
                      <TableRow key={pr.id}>
                        <TableCell className="font-medium">{pr.item_name}</TableCell>
                        <TableCell className="font-mono">{pr.quantity}</TableCell>
                        <TableCell><Badge variant={pr.urgency === 'urgent' ? 'destructive' : 'secondary'}>{pr.urgency}</Badge></TableCell>
                        <TableCell><Badge>{pr.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(pr.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grn" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Received From</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No GRN records yet. Record a goods receipt to track inventory intake.</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No stock transfers yet.</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
            <PerishableForecast items={items} />
          </TabsContent>
        </Tabs>

        <Dialog open={isPrOpen} onOpenChange={setIsPrOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Item Name *</Label><Input value={newPr.item_name} onChange={e => setNewPr(p => ({...p, item_name: e.target.value}))} placeholder="e.g., Eggs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Quantity</Label><Input type="number" min={1} value={newPr.quantity} onChange={e => setNewPr(p => ({...p, quantity: parseInt(e.target.value) || 0}))} /></div>
                <div className="space-y-1"><Label>Urgency</Label><Select value={newPr.urgency} onValueChange={v => setNewPr(p => ({...p, urgency: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={newPr.notes} onChange={e => setNewPr(p => ({...p, notes: e.target.value}))} placeholder="Reason for request..." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPrOpen(false)}>Cancel</Button><Button onClick={handleCreatePr}>Submit Request</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isGrnOpen} onOpenChange={setIsGrnOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Goods Receipt</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Item Name *</Label><Input value={newGrn.item_name} onChange={e => setNewGrn(p => ({...p, item_name: e.target.value}))} placeholder="e.g., Eggs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Quantity Received</Label><Input type="number" min={1} value={newGrn.quantity} onChange={e => setNewGrn(p => ({...p, quantity: parseInt(e.target.value) || 0}))} /></div>
                <div className="space-y-1"><Label>Received From</Label><Input value={newGrn.received_from} onChange={e => setNewGrn(p => ({...p, received_from: e.target.value}))} placeholder="Supplier name" /></div>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={newGrn.notes} onChange={e => setNewGrn(p => ({...p, notes: e.target.value}))} placeholder="Quality check notes..." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsGrnOpen(false)}>Cancel</Button><Button onClick={handleCreateGrn}>Record Receipt</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Item *</Label><Input value={newTransfer.item_name} onChange={e => setNewTransfer(p => ({...p, item_name: e.target.value}))} placeholder="e.g., Towels" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>From Location</Label><Input value={newTransfer.from} onChange={e => setNewTransfer(p => ({...p, from: e.target.value}))} placeholder="Main Store" /></div>
                <div className="space-y-1"><Label>To Location</Label><Input value={newTransfer.to} onChange={e => setNewTransfer(p => ({...p, to: e.target.value}))} placeholder="Floor 3 Pantry" /></div>
              </div>
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" min={1} value={newTransfer.quantity} onChange={e => setNewTransfer(p => ({...p, quantity: parseInt(e.target.value) || 0}))} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancel</Button><Button onClick={handleCreateTransfer}>Create Transfer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
