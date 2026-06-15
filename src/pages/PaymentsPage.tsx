import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayments } from '@/hooks/usePayments';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import { formatCurrency, getCountryOption } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Search, RefreshCw, Plus, FileText, DollarSign, CreditCard, Receipt, Eye, Landmark, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type FolioStatus = 'open' | 'closed' | 'pending' | 'disputed';
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

interface Folio { id: string; folio_number: string; guest_name: string; room_number: string; check_in: string; check_out: string; total_amount: number; paid_amount: number; outstanding: number; status: FolioStatus; }
interface Invoice { id: string; invoice_number: string; guest_name: string; invoice_date: string; total: number; tax_total: number; status: InvoiceStatus; payment_date: string | null; }

export default function PaymentsPage() {
  const { toast } = useToast();
  const { payments, isLoading, stats, refetch } = usePayments();
  const { branding } = useHotelBranding();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [folios, setFolios] = useState<Folio[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [folioLoading, setFolioLoading] = useState(false);
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const [folioDetailOpen, setFolioDetailOpen] = useState(false);
  const [folioCharges, setFolioCharges] = useState<any[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositGuest, setDepositGuest] = useState('');
  const [depositType, setDepositType] = useState('reservation');
  const [gstRate, setGstRate] = useState(18);
  const [tab, setTab] = useState('payments');

  const currencyOption = getCountryOption(branding.country, branding.currency);
  const money = (amount: number) => formatCurrency(amount, currencyOption);

  const filteredPayments = payments.filter(p =>
    p.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.guest_stays?.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => { fetchFolios(); fetchInvoices(); }, []);

  const fetchFolios = async () => {
    setFolioLoading(true);
    try {
      const res = await fetch('/api/billing/folios'); const json = await res.json(); setFolios(json.data || []);
    } catch { /* ignore */ }
    setFolioLoading(false);
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/billing/invoices'); const json = await res.json(); setInvoices(json.data || []);
    } catch { /* ignore */ }
  };

  const viewFolio = async (id: string) => {
    try {
      const res = await fetch(`/api/billing/folios/${id}`); const json = await res.json();
      setFolioCharges(json.data?.charges || []);
      setSelectedFolio(json.data || folios.find(f => f.id === id) || null);
      setFolioDetailOpen(true);
    } catch { toast({ title: 'Error loading folio', variant: 'destructive' }); }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch(); await fetchFolios(); await fetchInvoices();
    setIsRefreshing(false);
  };

  const handleDeposit = async () => {
    if (!depositGuest || depositAmount <= 0) return;
    toast({ title: 'Deposit recorded', description: `₹${depositAmount} deposit for ${depositGuest}` });
    setDepositOpen(false);
    setDepositAmount(0);
    setDepositGuest('');
  };

  const statusIcon = (s: string) => {
    switch(s) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': case 'refunded': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusBadge = (s: string) => {
    const styles: Record<string,string> = { completed:'bg-green-100 text-green-800', pending:'bg-amber-100 text-amber-800', failed:'bg-red-100 text-red-800', refunded:'bg-gray-100 text-gray-800', paid:'bg-green-100 text-green-800', draft:'bg-gray-100 text-gray-800', sent:'bg-blue-100 text-blue-800', cancelled:'bg-red-100 text-red-800', open:'bg-blue-100 text-blue-800', closed:'bg-gray-100 text-gray-800', disputed:'bg-red-100 text-red-800' };
    return <Badge variant="outline" className={cn('border-2', styles[s])}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Billing & Finance</h2>
            <p className="text-muted-foreground">Payments, folios, invoices, GST compliance, and deposits</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'deposits' && (
              <Button onClick={() => setDepositOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Deposit</Button>
            )}
            <Button variant="outline" size="icon" onClick={handleRefresh}><RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} /></Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
            <TabsTrigger value="folios"><Receipt className="h-4 w-4 mr-1" /> Folios</TabsTrigger>
            <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
            <TabsTrigger value="gst"><Percent className="h-4 w-4 mr-1" /> GST</TabsTrigger>
            <TabsTrigger value="deposits"><Banknote className="h-4 w-4 mr-1" /> Deposits</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Failed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{stats.failed}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{money(stats.total)}</p></CardContent></Card>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Payment #</TableHead><TableHead>Guest</TableHead><TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-bold">{p.payment_number}</TableCell>
                      <TableCell>{p.guest_stays?.guest_name || 'N/A'}{p.guest_stays?.rooms?.room_number && <span className="ml-1 text-xs text-muted-foreground">(Rm {p.guest_stays.rooms.room_number})</span>}</TableCell>
                      <TableCell>{p.orders?.order_number || '-'}</TableCell>
                      <TableCell className="font-mono font-bold">{money(Number(p.amount))}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell><div className="flex items-center gap-2">{statusIcon(p.status)}{statusBadge(p.status)}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No payments found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Folios Tab */}
          <TabsContent value="folios" className="space-y-4">
            <Card><CardContent className="p-0">
              {folioLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : folios.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground"><Receipt className="h-12 w-12 mb-3" /><p>No folios yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Folio #</TableHead><TableHead>Guest</TableHead><TableHead>Room</TableHead>
                    <TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {folios.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono font-bold">{f.folio_number}</TableCell>
                        <TableCell>{f.guest_name}</TableCell>
                        <TableCell>{f.room_number}</TableCell>
                        <TableCell className="font-mono">{money(f.total_amount)}</TableCell>
                        <TableCell className="font-mono">{money(f.paid_amount)}</TableCell>
                        <TableCell className={cn('font-mono', f.outstanding > 0 && 'text-destructive font-bold')}>{money(f.outstanding)}</TableCell>
                        <TableCell>{statusBadge(f.status)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => viewFolio(f.id)}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card><CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mb-3" /><p>No invoices generated yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice #</TableHead><TableHead>Guest</TableHead><TableHead>Date</TableHead>
                    <TableHead>Total</TableHead><TableHead>GST</TableHead><TableHead>Status</TableHead><TableHead>Payment Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-bold">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.guest_name}</TableCell>
                        <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">{money(inv.total)}</TableCell>
                        <TableCell className="font-mono">{money(inv.tax_total)}</TableCell>
                        <TableCell>{statusBadge(inv.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.payment_date ? new Date(inv.payment_date).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* GST Tab */}
          <TabsContent value="gst" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">GST Rate</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Input type="number" value={gstRate} onChange={e => setGstRate(Number(e.target.value))} className="w-20" min={0} max={28} />
                  <span>%</span>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'GST rate saved' })}>Save</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">GST Collected (MTD)</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{money(invoices.reduce((s, i) => s + i.tax_total, 0))}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">GSTIN</CardTitle></CardHeader>
                <CardContent><p className="text-sm font-mono">27AABCU9603R1Z0</p></CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">GST Slabs</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[{cat:'Room Charges',rate:'18%'},{cat:'Restaurant',rate:'18%'},{cat:'Spa Services',rate:'18%'},{cat:'Laundry',rate:'18%'}].map((s, i) => (
                      <TableRow key={i}><TableCell>{s.cat}</TableCell><TableCell>{s.rate}</TableCell><TableCell><Badge variant="default">Active</Badge></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">GST Reports</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline"><FileText className="h-4 w-4 mr-1" />Sales Register</Button>
                <Button variant="outline"><FileText className="h-4 w-4 mr-1" />Summary Report</Button>
                <Button variant="outline"><FileText className="h-4 w-4 mr-1" />Tax Liability</Button>
                <Button variant="outline"><FileText className="h-4 w-4 mr-1" />Invoice-wise Report</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Deposit ID</TableHead><TableHead>Guest</TableHead><TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[1,2,3].map(i => (
                      <TableRow key={i}>
                        <TableCell className="font-mono font-bold">DEP-00{i}</TableCell>
                        <TableCell>Guest {i}</TableCell>
                        <TableCell className="capitalize">{['reservation','security','event'][i-1]}</TableCell>
                        <TableCell className="font-mono">{money(5000 * i)}</TableCell>
                        <TableCell className="text-sm">{new Date().toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-green-100 text-green-800 border-green-400">Received</Badge></TableCell>
                        <TableCell><Button size="sm" variant="ghost">Adjust</Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow><TableCell colSpan={7} className="py-4 text-center text-muted-foreground">Sample deposit records shown above</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Folio Detail Dialog */}
        <Dialog open={folioDetailOpen} onOpenChange={setFolioDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Folio {selectedFolio?.folio_number} - {selectedFolio?.guest_name}</DialogTitle></DialogHeader>
            {selectedFolio && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Room:</span> <span className="font-medium">{selectedFolio.room_number}</span></div>
                  <div><span className="text-muted-foreground">Check-in:</span> <span className="font-medium">{new Date(selectedFolio.check_in).toLocaleDateString()}</span></div>
                  <div><span className="text-muted-foreground">Check-out:</span> <span className="font-medium">{new Date(selectedFolio.check_out).toLocaleDateString()}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedFolio.status)}</div>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {folioCharges.map((c: any, i: number) => (
                      <TableRow key={c.id || i}>
                        <TableCell>{new Date(c.posted_at || c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{c.description}</TableCell>
                        <TableCell className={cn('font-mono', c.charge_type === 'credit' ? 'text-green-600' : '')}>{c.charge_type === 'credit' ? '-' : ''}{money(Number(c.amount))}</TableCell>
                        <TableCell className="capitalize">{c.charge_type || 'debit'}</TableCell>
                      </TableRow>
                    ))}
                    {folioCharges.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No charges recorded</TableCell></TableRow>}
                  </TableBody>
                </Table>
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono font-bold">{money(selectedFolio.total_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-mono text-green-600">{money(selectedFolio.paid_amount)}</span></div>
                  <div className="flex justify-between text-base"><span className="font-medium">Outstanding</span><span className={cn('font-mono font-bold', selectedFolio.outstanding > 0 ? 'text-destructive' : 'text-green-600')}>{money(selectedFolio.outstanding)}</span></div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setFolioDetailOpen(false)}>Close</Button>
              <Button variant="outline"><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button variant="outline"><Mail className="h-4 w-4 mr-1" />Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deposit Dialog */}
        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Deposit</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Guest Name *</Label>
                <Input value={depositGuest} onChange={e => setDepositGuest(e.target.value)} placeholder="Guest name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Deposit Type</Label>
                  <Select value={depositType} onValueChange={setDepositType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reservation">Reservation</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Amount *</Label>
                  <Input type="number" min={0} value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button onClick={handleDeposit}>Record Deposit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function Printer(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function Mail(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function Banknote(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>; }
function Percent(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>; }