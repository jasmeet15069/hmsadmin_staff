import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Plus, Building2, Package, Star, StarOff, CheckCircle, XCircle, FileText, Scale, DollarSign, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string; name: string; contact_person: string; email: string; phone: string;
  address: string; category: string; rating: number; active: boolean; created_at: string;
}

interface PurchaseOrder {
  id: string; po_number: string; vendor_id: string; vendor_name?: string;
  items: string; total: number; notes: string; status: string; created_at: string;
}

interface Quotation {
  id: string; vendor_name: string; items: string; total: number; valid_until: string; status: string;
}

interface VendorPayment {
  id: string; vendor_name: string; po_number: string; amount: number; method: string; date: string;
}

const poStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800', pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
    received: 'bg-blue-100 text-blue-800',
  };
  return <Badge variant="outline" className={cn('border-2', styles[status] || '')}>{status.toUpperCase()}</Badge>;
};

export default function ProcurementPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('vendors');
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isVendorOpen, setIsVendorOpen] = useState(false);
  const [isPoOpen, setIsPoOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', category: '' });
  const [newPo, setNewPo] = useState({ vendor_id: '', items: '', notes: '' });

  const [quotations, setQuotations] = useState<Quotation[]>([
    { id: '1', vendor_name: 'ACME Supplies', items: 'Towels (100), Sheets (50)', total: 1250, valid_until: '2026-07-15', status: 'pending' },
    { id: '2', vendor_name: 'Global Textiles', items: 'Towels (100), Sheets (50)', total: 1180, valid_until: '2026-07-20', status: 'pending' },
    { id: '3', vendor_name: 'Prime Linens', items: 'Towels (100), Sheets (50)', total: 1320, valid_until: '2026-07-10', status: 'pending' },
  ]);

  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ vendor_id: '', po_number: '', amount: 0, method: 'bank_transfer' });

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/procurement/vendors');
      const json = await res.json();
      setVendors(json.data || []);
    } catch {
      toast({ title: 'Error loading vendors', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/procurement/purchase-orders');
      const json = await res.json();
      setPurchaseOrders(json.data || []);
    } catch {
      toast({ title: 'Error loading purchase orders', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (tab === 'vendors') fetchVendors();
    if (tab === 'purchase-orders') fetchPurchaseOrders();
  }, [tab]);

  const deactivateVendor = async (id: string) => {
    try {
      await fetch(`/api/procurement/vendors/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }),
      });
      toast({ title: 'Vendor deactivated' });
      fetchVendors();
    } catch {
      toast({ title: 'Error deactivating vendor', variant: 'destructive' });
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.name) return;
    try {
      const res = await fetch('/api/procurement/vendors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newVendor),
      });
      if (!res.ok) throw new Error();
      setIsVendorOpen(false);
      setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '', category: '' });
      fetchVendors();
      toast({ title: 'Vendor added' });
    } catch {
      toast({ title: 'Error adding vendor', variant: 'destructive' });
    }
  };

  const handleCreatePo = async () => {
    if (!newPo.vendor_id || !newPo.items) return;
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPo),
      });
      if (!res.ok) throw new Error();
      setIsPoOpen(false);
      setNewPo({ vendor_id: '', items: '', notes: '' });
      fetchPurchaseOrders();
      toast({ title: 'Purchase order created' });
    } catch {
      toast({ title: 'Error creating purchase order', variant: 'destructive' });
    }
  };

  const updatePoStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      fetchPurchaseOrders();
      toast({ title: `PO ${status}` });
    } catch {
      toast({ title: 'Error updating PO', variant: 'destructive' });
    }
  };

  const handleSelectQuotation = (id: string) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: 'selected' } : { ...q, status: q.status === 'selected' ? 'pending' : q.status }));
    toast({ title: 'Quotation selected' });
  };

  const handleRecordPayment = async () => {
    setVendorPayments(prev => [...prev, { ...newPayment, id: Date.now().toString(), vendor_name: vendors.find(v => v.id === newPayment.vendor_id)?.name || '', date: new Date().toISOString() }]);
    setIsPaymentOpen(false);
    setNewPayment({ vendor_id: '', po_number: '', amount: 0, method: 'bank_transfer' });
    toast({ title: 'Payment recorded' });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      i < rating ? <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff key={i} className="h-4 w-4 text-muted-foreground" />
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Procurement</h2>
            <p className="text-muted-foreground">Vendor management, purchase orders, quotations, and payments</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'vendors' && <Button onClick={() => setIsVendorOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>}
            {tab === 'purchase-orders' && <Button onClick={() => setIsPoOpen(true)}><Plus className="h-4 w-4 mr-1" /> New PO</Button>}
            {tab === 'payments' && <Button onClick={() => setIsPaymentOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record Payment</Button>}
            <Button variant="outline" size="icon" onClick={tab === 'vendors' ? fetchVendors : fetchPurchaseOrders}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="vendors"><Building2 className="h-4 w-4 mr-1" /> Vendors</TabsTrigger>
            <TabsTrigger value="purchase-orders"><Package className="h-4 w-4 mr-1" /> Purchase Orders</TabsTrigger>
            <TabsTrigger value="quotations"><Scale className="h-4 w-4 mr-1" /> Quotations</TabsTrigger>
            <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : vendors.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mb-3" />
                    <p>No vendors yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.contact_person}</TableCell>
                          <TableCell className="text-sm">{v.email}</TableCell>
                          <TableCell>{v.phone}</TableCell>
                          <TableCell>{v.category}</TableCell>
                          <TableCell><div className="flex">{renderStars(v.rating)}</div></TableCell>
                          <TableCell><Badge variant={v.active ? 'default' : 'secondary'}>{v.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell>{v.active && <Button size="sm" variant="ghost" onClick={() => deactivateVendor(v.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase-orders" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mb-3" />
                    <p>No purchase orders yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO #</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-36">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map(po => (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono font-bold">{po.po_number}</TableCell>
                          <TableCell>{po.vendor_name || po.vendor_id}</TableCell>
                          <TableCell>{poStatusBadge(po.status)}</TableCell>
                          <TableCell className="font-mono font-bold">${Number(po.total).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {po.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => updatePoStatus(po.id, 'approved')}><CheckCircle className="h-3 w-3 mr-1" /> Approve</Button>
                                  <Button size="sm" variant="ghost" onClick={() => updatePoStatus(po.id, 'rejected')}><XCircle className="h-3 w-3 mr-1" /> Reject</Button>
                                </>
                              )}
                              {po.status === 'approved' && <Button size="sm" variant="outline" onClick={() => updatePoStatus(po.id, 'received')}><FileText className="h-3 w-3 mr-1" /> Receive</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {quotations.map(q => (
                <Card key={q.id} className={cn('border-2', q.status === 'selected' && 'border-green-500 bg-green-50')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{q.vendor_name}</CardTitle>
                      {q.status === 'selected' && <Badge className="bg-green-100 text-green-800 border-green-400"><ThumbsUp className="h-3 w-3 mr-1" /> Selected</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{q.items}</p>
                    <p className="mt-2 text-2xl font-bold">${q.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Valid until {new Date(q.valid_until).toLocaleDateString()}</p>
                    <Button className="mt-3 w-full" variant={q.status === 'selected' ? 'outline' : 'default'} onClick={() => handleSelectQuotation(q.id)} disabled={q.status === 'selected'}>
                      {q.status === 'selected' ? <><CheckCircle className="mr-2 h-4 w-4" /> Selected</> : <><Scale className="mr-2 h-4 w-4" /> Select</>}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>PO #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payments recorded yet</TableCell></TableRow>
                    ) : vendorPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.vendor_name}</TableCell>
                        <TableCell className="font-mono">{p.po_number}</TableCell>
                        <TableCell className="font-mono font-bold">${Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isVendorOpen} onOpenChange={setIsVendorOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Vendor Name *</Label><Input value={newVendor.name} onChange={e => setNewVendor(p => ({...p, name: e.target.value}))} placeholder="e.g., ACME Supplies" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Contact Person</Label><Input value={newVendor.contact_person} onChange={e => setNewVendor(p => ({...p, contact_person: e.target.value}))} placeholder="John Doe" /></div>
                <div className="space-y-1"><Label>Category</Label><Input value={newVendor.category} onChange={e => setNewVendor(p => ({...p, category: e.target.value}))} placeholder="e.g., Food & Beverage" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={newVendor.email} onChange={e => setNewVendor(p => ({...p, email: e.target.value}))} placeholder="vendor@example.com" /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={newVendor.phone} onChange={e => setNewVendor(p => ({...p, phone: e.target.value}))} placeholder="+1 555-0123" /></div>
              </div>
              <div className="space-y-1"><Label>Address</Label><Input value={newVendor.address} onChange={e => setNewVendor(p => ({...p, address: e.target.value}))} placeholder="123 Main St, City" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsVendorOpen(false)}>Cancel</Button><Button onClick={handleAddVendor}>Add Vendor</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPoOpen} onOpenChange={setIsPoOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Vendor *</Label><Select value={newPo.vendor_id} onValueChange={v => setNewPo(p => ({...p, vendor_id: v}))}><SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger><SelectContent>{vendors.filter(v => v.active).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Items (JSON) *</Label><Textarea value={newPo.items} onChange={e => setNewPo(p => ({...p, items: e.target.value}))} placeholder='[{"name": "Towels", "qty": 100, "unit_price": 5.50}]' className="min-h-[100px] font-mono text-sm" /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={newPo.notes} onChange={e => setNewPo(p => ({...p, notes: e.target.value}))} placeholder="Delivery instructions..." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPoOpen(false)}>Cancel</Button><Button onClick={handleCreatePo}>Create PO</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Vendor Payment</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Vendor</Label><Select value={newPayment.vendor_id} onValueChange={v => setNewPayment(p => ({...p, vendor_id: v}))}><SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger><SelectContent>{vendors.filter(v => v.active).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>PO Number</Label><Input value={newPayment.po_number} onChange={e => setNewPayment(p => ({...p, po_number: e.target.value}))} placeholder="PO-001" /></div>
                <div className="space-y-1"><Label>Amount</Label><Input type="number" min={0} step="0.01" value={newPayment.amount} onChange={e => setNewPayment(p => ({...p, amount: parseFloat(e.target.value) || 0}))} /></div>
              </div>
              <div className="space-y-1"><Label>Payment Method</Label><Select value={newPayment.method} onValueChange={v => setNewPayment(p => ({...p, method: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button><Button onClick={handleRecordPayment}>Record Payment</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
