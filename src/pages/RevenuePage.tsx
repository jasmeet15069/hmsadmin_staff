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
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Plus, TrendingUp, DollarSign, Percent, BarChart3, Trash2, Eye, EyeOff, CalendarDays, Sun, Snowflake, CloudSun, LineChart, TrendingDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingRule {
  id: string; name: string; rule_type: string; adjustment: number; priority: number;
  active: boolean; created_at: string;
}

interface YieldData {
  revpar: number; adr: number; occupancy: number; goppar: number;
}

interface CompetitorRate {
  id: string; competitor_name: string; room_type: string; rate: number; last_updated: string;
}

interface ForecastRecord {
  id: string; forecast_date: string; occupancy: number; revenue: number;
}

const seasons = [
  { month: 'Jan', season: 'Low', color: 'bg-blue-100 text-blue-800' },
  { month: 'Feb', season: 'Low', color: 'bg-blue-100 text-blue-800' },
  { month: 'Mar', season: 'Shoulder', color: 'bg-amber-100 text-amber-800' },
  { month: 'Apr', season: 'High', color: 'bg-green-100 text-green-800' },
  { month: 'May', season: 'High', color: 'bg-green-100 text-green-800' },
  { month: 'Jun', season: 'Peak', color: 'bg-red-100 text-red-800' },
  { month: 'Jul', season: 'Peak', color: 'bg-red-100 text-red-800' },
  { month: 'Aug', season: 'Peak', color: 'bg-red-100 text-red-800' },
  { month: 'Sep', season: 'Shoulder', color: 'bg-amber-100 text-amber-800' },
  { month: 'Oct', season: 'High', color: 'bg-green-100 text-green-800' },
  { month: 'Nov', season: 'Shoulder', color: 'bg-amber-100 text-amber-800' },
  { month: 'Dec', season: 'Peak', color: 'bg-red-100 text-red-800' },
];

const demandPredictions = [
  { date: '2026-06-16', day: 'Mon', predicted: 72, actual: 68, rooms: 24 },
  { date: '2026-06-17', day: 'Tue', predicted: 65, actual: 62, rooms: 21 },
  { date: '2026-06-18', day: 'Wed', predicted: 60, actual: null, rooms: 18 },
  { date: '2026-06-19', day: 'Thu', predicted: 58, actual: null, rooms: 16 },
  { date: '2026-06-20', day: 'Fri', predicted: 85, actual: null, rooms: 30 },
  { date: '2026-06-21', day: 'Sat', predicted: 92, actual: null, rooms: 33 },
  { date: '2026-06-22', day: 'Sun', predicted: 78, actual: null, rooms: 26 },
];

export default function RevenuePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('pricing-rules');
  const [isLoading, setIsLoading] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [yieldData, setYieldData] = useState<YieldData | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorRate[]>([]);
  const [forecast, setForecast] = useState<ForecastRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', rule_type: 'seasonal', adjustment: 0, priority: 1 });

  const fetchPricingRules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/revenue/pricing-rules');
      const json = await res.json();
      setPricingRules(json.data || []);
    } catch {
      toast({ title: 'Error loading pricing rules', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const fetchYield = async () => {
    try {
      const res = await fetch('/api/revenue/yield');
      const json = await res.json();
      setYieldData(json.data || null);
    } catch { /* ignore */ }
  };

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/revenue/competitors');
      const json = await res.json();
      setCompetitors(json.data || []);
    } catch { /* ignore */ }
  };

  const fetchForecast = async () => {
    try {
      const res = await fetch('/api/revenue/forecast');
      const json = await res.json();
      setForecast(json.data || []);
    } catch { /* ignore */ }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchPricingRules(), fetchYield(), fetchCompetitors(), fetchForecast()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (tab === 'pricing-rules') fetchPricingRules();
    if (tab === 'yield-dashboard') { fetchYield(); fetchCompetitors(); }
    if (tab === 'forecast') fetchForecast();
  }, [tab]);

  const toggleRuleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/revenue/pricing-rules/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }),
      });
      toast({ title: active ? 'Rule deactivated' : 'Rule activated' });
      fetchPricingRules();
    } catch {
      toast({ title: 'Error updating rule', variant: 'destructive' });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/revenue/pricing-rules/${id}`, { method: 'DELETE' });
      toast({ title: 'Rule deleted' });
      fetchPricingRules();
    } catch {
      toast({ title: 'Error deleting rule', variant: 'destructive' });
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name) return;
    try {
      const res = await fetch('/api/revenue/pricing-rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRule),
      });
      if (!res.ok) throw new Error();
      setIsCreateOpen(false);
      setNewRule({ name: '', rule_type: 'seasonal', adjustment: 0, priority: 1 });
      fetchPricingRules();
      toast({ title: 'Pricing rule created' });
    } catch {
      toast({ title: 'Error creating rule', variant: 'destructive' });
    }
  };

  const KpiCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('h-5 w-5', color)} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Revenue Management</h2>
            <p className="text-muted-foreground">Pricing rules, seasonal calendar, yield dashboard, and forecasting</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'pricing-rules' && (
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
            )}
            <Button variant="outline" size="icon" onClick={refreshAll}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing-rules"><TrendingUp className="h-4 w-4 mr-1" /> Pricing Rules</TabsTrigger>
            <TabsTrigger value="seasonal-calendar"><CalendarDays className="h-4 w-4 mr-1" /> Seasonal Calendar</TabsTrigger>
            <TabsTrigger value="demand-prediction"><LineChart className="h-4 w-4 mr-1" /> Demand Prediction</TabsTrigger>
            <TabsTrigger value="yield-dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Yield Dashboard</TabsTrigger>
            <TabsTrigger value="forecast"><DollarSign className="h-4 w-4 mr-1" /> Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing-rules" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : pricingRules.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-3" />
                    <p>No pricing rules defined</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Adjustment</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingRules.map(rule => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell className="capitalize">{rule.rule_type}</TableCell>
                          <TableCell className="font-mono">{rule.adjustment > 0 ? '+' : ''}{rule.adjustment}%</TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            <Badge variant={rule.active ? 'default' : 'secondary'}>{rule.active ? 'Active' : 'Inactive'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => toggleRuleActive(rule.id, rule.active)}>
                                {rule.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
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

          <TabsContent value="seasonal-calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seasonal Pricing Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {seasons.map(s => (
                    <div key={s.month} className={cn('rounded-lg border-2 p-4 text-center', s.color)}>
                      <p className="text-lg font-bold">{s.month}</p>
                      <p className="text-xs font-semibold">{s.season}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[{ label: 'Low', icon: Snowflake, color: 'text-blue-700 bg-blue-50 border-blue-300' },
                    { label: 'Shoulder', icon: CloudSun, color: 'text-amber-700 bg-amber-50 border-amber-300' },
                    { label: 'High', icon: Sun, color: 'text-green-700 bg-green-50 border-green-300' },
                    { label: 'Peak', icon: Zap, color: 'text-red-700 bg-red-50 border-red-300' },
                  ].map(l => (
                    <div key={l.label} className={cn('flex items-center gap-2 border-2 px-3 py-2 text-sm font-medium', l.color)}>
                      <l.icon className="h-4 w-4" /> {l.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demand-prediction" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Predicted Occupancy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">72%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Next Weekend</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">92%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Est. Revenue (7d)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">$24,500</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Forecast Accuracy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">94%</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">7-Day Demand Forecast</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Predicted %</TableHead>
                      <TableHead>Actual %</TableHead>
                      <TableHead>Est. Rooms Sold</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandPredictions.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{new Date(d.date).toLocaleDateString()}</TableCell>
                        <TableCell>{d.day}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${d.predicted}%` }} />
                            </div>
                            <span className="font-mono">{d.predicted}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{d.actual != null ? `${d.actual}%` : '-'}</TableCell>
                        <TableCell className="font-mono">{d.rooms}</TableCell>
                        <TableCell>{d.actual != null && Math.abs(d.predicted - d.actual) <= 5 ? <Badge className="bg-green-100 text-green-800 border-green-400">Accurate</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yield-dashboard" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <KpiCard title="RevPAR" value={yieldData ? `$${yieldData.revpar.toFixed(2)}` : '-'} icon={DollarSign} color="text-green-600" />
                  <KpiCard title="ADR" value={yieldData ? `$${yieldData.adr.toFixed(2)}` : '-'} icon={TrendingUp} color="text-blue-600" />
                  <KpiCard title="Occupancy %" value={yieldData ? `${yieldData.occupancy.toFixed(1)}%` : '-'} icon={Percent} color="text-amber-600" />
                  <KpiCard title="GOPPAR" value={yieldData ? `$${yieldData.goppar.toFixed(2)}` : '-'} icon={BarChart3} color="text-purple-600" />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Competitor Rate Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {competitors.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No competitor data available</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Competitor</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competitors.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.competitor_name}</TableCell>
                              <TableCell>{c.room_type}</TableCell>
                              <TableCell className="font-mono font-bold">${c.rate.toFixed(2)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(c.last_updated).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : forecast.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mb-3" />
                    <p>No forecast data available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Occupancy %</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecast.map(f => (
                        <TableRow key={f.id}>
                          <TableCell>{new Date(f.forecast_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono">{f.occupancy.toFixed(1)}%</TableCell>
                          <TableCell className="font-mono font-bold">${f.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Pricing Rule</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Rule Name *</Label>
                <Input value={newRule.name} onChange={e => setNewRule(p => ({...p, name: e.target.value}))} placeholder="e.g., Summer Premium" />
              </div>
              <div className="space-y-1">
                <Label>Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={v => setNewRule(p => ({...p, rule_type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="occupancy">Occupancy-Based</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Adjustment: {newRule.adjustment}%</Label>
                <Slider value={[newRule.adjustment]} onValueChange={([v]) => setNewRule(p => ({...p, adjustment: v}))} min={-50} max={100} step={1} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Input type="number" min={1} value={newRule.priority} onChange={e => setNewRule(p => ({...p, priority: parseInt(e.target.value) || 1}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRule}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
