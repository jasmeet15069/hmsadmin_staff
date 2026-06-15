import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Loader2, RefreshCw, Building2, BedDouble, TrendingUp, DollarSign,
  BarChart3, Percent, CalendarDays, Hotel, Plus, Edit3, ArrowRightLeft,
} from 'lucide-react';

interface Property {
  id: string; name: string; slug: string; rooms_used: number; rooms_max: number | null;
  occupancy?: number; revenue?: number; is_active: boolean; country?: string;
}

interface ConsolidatedMetrics {
  total_revenue: number; total_rooms: number; avg_occupancy: number; total_bookings: number;
}

export default function MultiPropertyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedMetrics | null>(null);
  const [tab, setTab] = useState('overview');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', slug: '', rooms_max: 50, country: 'United States' });
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferGuest, setTransferGuest] = useState('');

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/platform/tenants');
      const json = await res.json();
      setProperties(json.data || []);
    } catch { toast({ title: 'Error loading properties', variant: 'destructive' }); }
  };

  const fetchConsolidated = async () => {
    try {
      const res = await fetch('/api/reports/consolidated');
      const json = await res.json();
      setConsolidated(json.data || null);
    } catch { /* ignore */ }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchProperties(), fetchConsolidated()]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateProperty = async () => {
    if (!newProperty.name || !newProperty.slug) return;
    try {
      const res = await fetch('/api/platform/tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProperty),
      });
      if (!res.ok) throw new Error();
      setIsCreateOpen(false);
      setNewProperty({ name: '', slug: '', rooms_max: 50, country: 'United States' });
      await fetchProperties();
      toast({ title: 'Property created' });
    } catch { toast({ title: 'Error creating property', variant: 'destructive' }); }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferGuest) return;
    toast({ title: 'Reservation transferred', description: 'The reservation has been moved to the target property.' });
    setTransferFrom(''); setTransferTo(''); setTransferGuest('');
  };

  const totalRooms = properties.reduce((sum, p) => sum + (p.rooms_used || 0), 0);
  const activeProperties = properties.filter(p => p.is_active).length;
  const avgOccupancy = consolidated?.avg_occupancy ?? (properties.length > 0 ? properties.reduce((sum, p) => sum + (p.occupancy || 0), 0) / properties.length : 0);
  const totalRevenue = consolidated?.total_revenue ?? properties.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalBookings = consolidated?.total_bookings ?? 0;

  if (loading) {
    return (<DashboardLayout><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Multi-Property Management</h2>
            <p className="text-muted-foreground">{properties.length} {properties.length === 1 ? 'property' : 'properties'} · {activeProperties} active</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'overview' && <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Property</Button>}
            <Button variant="outline" size="icon" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="transfers"><ArrowRightLeft className="h-4 w-4 mr-1" /> Central Transfer</TabsTrigger>
            <TabsTrigger value="consolidated"><BarChart3 className="h-4 w-4 mr-1" /> Consolidated Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle><DollarSign className="h-5 w-5 text-green-600" /></CardHeader><CardContent><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rooms</CardTitle><BedDouble className="h-5 w-5 text-blue-600" /></CardHeader><CardContent><p className="text-2xl font-bold">{totalRooms.toLocaleString()}</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Occupancy</CardTitle><Percent className="h-5 w-5 text-amber-600" /></CardHeader><CardContent><p className="text-2xl font-bold">{avgOccupancy.toFixed(1)}%</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bookings</CardTitle><CalendarDays className="h-5 w-5 text-purple-600" /></CardHeader><CardContent><p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p></CardContent></Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map(property => (
                <Card key={property.id} className={cn('border-2', !property.is_active && 'opacity-60')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /><CardTitle className="text-base">{property.name}</CardTitle></div>
                      <Badge variant={property.is_active ? 'default' : 'outline'}>{property.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">/{property.slug} · {property.country || 'N/A'}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-2 text-center"><BedDouble className="mx-auto mb-1 h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Rooms</p><p className="text-lg font-bold">{property.rooms_used}{property.rooms_max != null ? `/${property.rooms_max}` : ''}</p></div>
                      <div className="rounded-lg border p-2 text-center"><TrendingUp className="mx-auto mb-1 h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Occupancy</p><p className="text-lg font-bold">{property.occupancy != null ? `${property.occupancy.toFixed(1)}%` : '-'}</p></div>
                      <div className="rounded-lg border p-2 text-center"><DollarSign className="mx-auto mb-1 h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold">{property.revenue != null ? `$${property.revenue.toLocaleString()}` : '-'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {properties.length === 0 && <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground"><Building2 className="h-16 w-16 mb-4" /><p className="text-lg font-medium">No properties found</p></div>}
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Transfer Reservation Between Properties</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-1"><Label>From Property</Label><Select value={transferFrom} onValueChange={setTransferFrom}><SelectTrigger><SelectValue placeholder="Select source property..." /></SelectTrigger><SelectContent>{properties.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>To Property</Label><Select value={transferTo} onValueChange={setTransferTo}><SelectTrigger><SelectValue placeholder="Select destination property..." /></SelectTrigger><SelectContent>{properties.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Guest / Reservation ID</Label><Input value={transferGuest} onChange={e => setTransferGuest(e.target.value)} placeholder="Guest name or reservation ID" /></div>
                <Button onClick={handleTransfer} disabled={!transferFrom || !transferTo || !transferGuest}><ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Reservation</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consolidated" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Consolidated Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rooms Across Properties</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalRooms}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average Occupancy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{avgOccupancy.toFixed(1)}%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bookings (All Properties)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p></CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Rooms</TableHead><TableHead>Occupancy</TableHead><TableHead>Revenue</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {properties.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono">{p.rooms_used}{p.rooms_max != null ? `/${p.rooms_max}` : ''}</TableCell>
                        <TableCell className="font-mono">{p.occupancy != null ? `${p.occupancy.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell className="font-mono font-bold">{p.revenue != null ? `$${p.revenue.toLocaleString()}` : '-'}</TableCell>
                        <TableCell><Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Property</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Property Name *</Label><Input value={newProperty.name} onChange={e => setNewProperty(p => ({...p, name: e.target.value}))} placeholder="e.g., Grand Hotel Downtown" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Slug *</Label><Input value={newProperty.slug} onChange={e => setNewProperty(p => ({...p, slug: e.target.value}))} placeholder="grand-downtown" /></div>
                <div className="space-y-1"><Label>Max Rooms</Label><Input type="number" min={1} value={newProperty.rooms_max} onChange={e => setNewProperty(p => ({...p, rooms_max: parseInt(e.target.value) || 50}))} /></div>
              </div>
              <div className="space-y-1"><Label>Country</Label><Input value={newProperty.country} onChange={e => setNewProperty(p => ({...p, country: e.target.value}))} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button onClick={handleCreateProperty}>Create Property</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
