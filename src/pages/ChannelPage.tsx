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
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Plus, Globe, Wifi, PlugZap, Unplug, BarChart3, TrendingUp, DollarSign, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OTAConnection {
  id: string; channel_name: string; channel_type: string;
  connected: boolean; enabled: boolean; last_sync: string | null;
}

interface ChannelAnalytics {
  channel_name: string; bookings: number; revenue: number;
}

export default function ChannelPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('connections');
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<OTAConnection[]>([]);
  const [analytics, setAnalytics] = useState<ChannelAnalytics[]>([]);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [newConnection, setNewConnection] = useState({ channel_name: '', channel_type: 'booking.com', api_key: '', api_secret: '' });

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/channel/connections');
      const json = await res.json();
      setConnections(json.data || []);
    } catch {
      toast({ title: 'Error loading connections', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/channel/analytics');
      const json = await res.json();
      setAnalytics(json.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (tab === 'connections') fetchConnections();
    if (tab === 'analytics') fetchAnalytics();
  }, [tab]);

  const handleConnect = async () => {
    if (!newConnection.channel_name || !newConnection.channel_type) return;
    try {
      const res = await fetch('/api/channel/connections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newConnection),
      });
      if (!res.ok) throw new Error();
      setIsConnectOpen(false);
      setNewConnection({ channel_name: '', channel_type: 'booking.com', api_key: '', api_secret: '' });
      fetchConnections();
      toast({ title: 'Channel connected' });
    } catch {
      toast({ title: 'Error connecting channel', variant: 'destructive' });
    }
  };

  const toggleEnabled = async (conn: OTAConnection) => {
    try {
      await fetch(`/api/channel/connections/${conn.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !conn.enabled }),
      });
      toast({ title: conn.enabled ? 'Channel disabled' : 'Channel enabled' });
      fetchConnections();
    } catch {
      toast({ title: 'Error toggling channel', variant: 'destructive' });
    }
  };

  const disconnect = async (id: string) => {
    try {
      await fetch(`/api/channel/connections/${id}`, { method: 'DELETE' });
      toast({ title: 'Channel disconnected' });
      fetchConnections();
    } catch {
      toast({ title: 'Error disconnecting channel', variant: 'destructive' });
    }
  };

  const totalBookings = analytics.reduce((sum, a) => sum + a.bookings, 0);
  const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Channel Manager</h2>
            <p className="text-muted-foreground">OTA connections, sync status, and channel analytics</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'connections' && (
              <Button onClick={() => setIsConnectOpen(true)}><Plus className="h-4 w-4 mr-1" /> Connect Channel</Button>
            )}
            <Button variant="outline" size="icon" onClick={tab === 'connections' ? fetchConnections : fetchAnalytics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections"><Globe className="h-4 w-4 mr-1" /> OTA Connections</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Channel Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : connections.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Wifi className="h-12 w-12 mb-3" />
                    <p>No channels connected yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Sync</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.channel_name}</TableCell>
                          <TableCell className="capitalize">{c.channel_type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={cn('h-2 w-2 rounded-full', c.connected ? 'bg-green-500' : 'bg-red-500')} />
                              <Badge variant={c.enabled ? 'default' : 'secondary'}>
                                {c.connected ? 'Connected' : 'Disconnected'}
                              </Badge>
                              {!c.enabled && <Badge variant="outline" className="border-amber-400 text-amber-700">Disabled</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.last_sync ? new Date(c.last_sync).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => toggleEnabled(c)}>
                                {c.enabled ? <Unplug className="h-3 w-3" /> : <PlugZap className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => disconnect(c.id)}>
                                <Unplug className="h-3 w-3 text-destructive" />
                              </Button>
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

          <TabsContent value="analytics" className="space-y-4">
            {analytics.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Bookings</CardTitle>
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Channel</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-3" />
                    <p>No analytics data available</p>
                    <p className="text-xs mt-1">Connect channels to see performance metrics</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((a, i) => (
                        <TableRow key={a.channel_name || i}>
                          <TableCell className="font-medium">{a.channel_name}</TableCell>
                          <TableCell className="font-mono">{a.bookings.toLocaleString()}</TableCell>
                          <TableCell className="font-mono font-bold">${a.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Connect OTA Channel</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Channel Name *</Label>
                <Input value={newConnection.channel_name} onChange={e => setNewConnection(p => ({...p, channel_name: e.target.value}))} placeholder="e.g., Booking.com" />
              </div>
              <div className="space-y-1">
                <Label>Channel Type *</Label>
                <Select value={newConnection.channel_type} onValueChange={v => setNewConnection(p => ({...p, channel_type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking.com">Booking.com</SelectItem>
                    <SelectItem value="expedia">Expedia</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="agoda">Agoda</SelectItem>
                    <SelectItem value="hotels.com">Hotels.com</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>API Key</Label>
                <Input value={newConnection.api_key} onChange={e => setNewConnection(p => ({...p, api_key: e.target.value}))} placeholder="API key" />
              </div>
              <div className="space-y-1">
                <Label>API Secret</Label>
                <Input type="password" value={newConnection.api_secret} onChange={e => setNewConnection(p => ({...p, api_secret: e.target.value}))} placeholder="API secret" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConnectOpen(false)}>Cancel</Button>
              <Button onClick={handleConnect}>Connect</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
