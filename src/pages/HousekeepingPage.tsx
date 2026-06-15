import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRooms } from '@/hooks/useRooms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, RefreshCw, Search, Plus, User, CheckCircle2, Clock, AlertTriangle,
  Wrench, Package, Grid3X3, List, ClipboardCheck, Luggage, Shirt, BarChart3,
  Star, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'tasks' | 'room-status' | 'lost-found' | 'linen' | 'productivity';
type TaskStatus = 'pending' | 'in_progress' | 'done' | 'inspected';
type LostStatus = 'unclaimed' | 'claimed' | 'returned' | 'disposed';

interface HKTask {
  id: string; room_id: string; assigned_to: string | null; task_type: string;
  priority: string; status: TaskStatus; notes: string | null; created_at: string;
  rooms?: { room_number?: string; room_type?: string | null; floor?: number | null } | null;
  profiles?: { full_name?: string } | null;
}

interface LostItem {
  id: string; item_description: string; category: string; found_date: string;
  found_location: string; guest_name: string | null; status: LostStatus; notes: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-red-100 border-red-400 text-red-800',
  in_progress: 'bg-blue-100 border-blue-400 text-blue-800',
  done: 'bg-green-100 border-green-400 text-green-800',
  inspected: 'bg-gray-100 border-gray-400 text-gray-800',
};

export default function HousekeepingPage() {
  const { toast } = useToast();
  const { rooms, stats: roomStats } = useRooms();
  const [tab, setTab] = useState<Tab>('tasks');
  const [items, setItems] = useState<HKTask[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ room_id: '', task_type: '', priority: 'medium', assigned_to: '', notes: '' });
  const [newLostItem, setNewLostItem] = useState({ item_description: '', category: 'Accessories', found_location: '', guest_name: '' });
  const [isLostOpen, setIsLostOpen] = useState(false);

  const [linenItems, setLinenItems] = useState<any[]>([]);
  const [linenTab, setLinenTab] = useState('stock');

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('housekeeping_assignments' as never)
      .select('*, rooms(room_number, room_type, floor), profiles(full_name)')
      .order('created_at', { ascending: false });
    setItems((data || []) as unknown as HKTask[]);
    setIsLoading(false);
  };

  const fetchLostItems = async () => {
    const res = await fetch('/api/housekeeping/lost-items');
    const json = await res.json();
    setLostItems(json.data || []);
  };

  useEffect(() => {
    if (tab === 'tasks') fetchTasks();
    if (tab === 'lost-found') fetchLostItems();
  }, [tab]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchTasks();
      toast({ title: `Task ${status.replace('_', ' ')}` });
    } catch { toast({ title: 'Error updating task', variant: 'destructive' }); }
  };

  const handleCreateTask = async () => {
    if (!newTask.room_id || !newTask.task_type) return;
    try {
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask),
      });
      if (!res.ok) throw new Error();
      setIsCreateOpen(false);
      setNewTask({ room_id: '', task_type: '', priority: 'medium', assigned_to: '', notes: '' });
      await fetchTasks();
      toast({ title: 'Task created' });
    } catch { toast({ title: 'Error creating task', variant: 'destructive' }); }
  };

  const handleLostAction = async (id: string, status: LostStatus) => {
    try {
      const res = await fetch(`/api/housekeeping/lost-items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchLostItems();
      toast({ title: `Item ${status}` });
    } catch { toast({ title: 'Error updating item', variant: 'destructive' }); }
  };

  const handleAddLost = async () => {
    try {
      const res = await fetch('/api/housekeeping/lost-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLostItem),
      });
      if (!res.ok) throw new Error();
      setIsLostOpen(false);
      setNewLostItem({ item_description: '', category: 'Accessories', found_location: '', guest_name: '' });
      await fetchLostItems();
      toast({ title: 'Lost item added' });
    } catch { toast({ title: 'Error adding item', variant: 'destructive' }); }
  };

  const filteredTasks = items.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return (i.rooms?.room_number || '').includes(q) || i.task_type.toLowerCase().includes(q);
  });

  const columns: { status: TaskStatus; label: string }[] = [
    { status: 'pending', label: 'Dirty / Pending' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'done', label: 'Done' },
    { status: 'inspected', label: 'Inspected' },
  ];

  const linenData = [
    { item: 'Bed Sheets', stock: 250, laundry: 50, damaged: 5, reorder: 100, total: 305 },
    { item: 'Pillowcases', stock: 300, laundry: 60, damaged: 8, reorder: 150, total: 368 },
    { item: 'Towels', stock: 400, laundry: 80, damaged: 10, reorder: 200, total: 490 },
    { item: 'Bath Mats', stock: 150, laundry: 30, damaged: 3, reorder: 75, total: 183 },
  ];

  const staffData = [
    { name: 'Maria Garcia', rooms: 12, avgTime: '45m', quality: 4.5, onTime: 94 },
    { name: 'Jose Rodriguez', rooms: 11, avgTime: '48m', quality: 4.3, onTime: 88 },
    { name: 'Ana Martinez', rooms: 10, avgTime: '50m', quality: 4.2, onTime: 87 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Housekeeping</h2>
            <p className="text-muted-foreground">Room status, cleaning tasks, lost & found, linen, and staff productivity</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'tasks' && <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Task</Button>}
            {tab === 'lost-found' && <Button onClick={() => setIsLostOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>}
            <Button variant="outline" size="icon" onClick={tab === 'tasks' ? fetchTasks : fetchLostItems}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex border-b">
          {[{id:'tasks',label:'Cleaning Tasks',icon:ClipboardCheck},{id:'room-status',label:'Room Status',icon:Grid3X3},{id:'lost-found',label:"Lost & Found",icon:Luggage},{id:'linen',label:'Linen',icon:Shirt},{id:'productivity',label:'Productivity',icon:BarChart3}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {columns.map(c => (
                <Card key={c.status}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{items.filter(i => i.status === c.status).length}</p></CardContent></Card>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search room or task..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="inspected">Inspected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-4">
                {columns.map(col => (
                  <section key={col.status} className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 pb-2"><h3 className="font-bold">{col.label}</h3><Badge variant="secondary">{filteredTasks.filter(i => i.status === col.status).length}</Badge></div>
                    {filteredTasks.filter(i => i.status === col.status).map(item => (
                      <div key={item.id} className="border-2 bg-card p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-lg font-bold">Room {item.rooms?.room_number || item.room_id}</p>
                            <p className="text-sm text-muted-foreground">{item.task_type.replaceAll('_', ' ')}<span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className={cn('h-3 w-3', item.priority === 'high' && 'text-red-500', item.priority === 'medium' && 'text-amber-500')} />{item.priority}</span></p>
                            {item.profiles?.full_name && <p className="text-xs text-muted-foreground mt-1"><User className="h-3 w-3 inline mr-1" />{item.profiles.full_name}</p>}
                          </div>
                          <Badge className={cn('border-2', statusColors[item.status])}>{item.status.replace('_', ' ')}</Badge>
                        </div>
                        {item.notes && <p className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">{item.notes}</p>}
                        <div className="mt-3 flex gap-2">
                          {item.status === 'pending' && <Button size="sm" onClick={() => updateStatus(item.id, 'in_progress')}><Clock className="h-3 w-3 mr-1" /> Start</Button>}
                          {item.status === 'in_progress' && <Button size="sm" onClick={() => updateStatus(item.id, 'done')}><CheckCircle2 className="h-3 w-3 mr-1" /> Done</Button>}
                          {item.status === 'done' && <Button size="sm" variant="secondary" onClick={() => updateStatus(item.id, 'inspected')}>Inspect</Button>}
                        </div>
                      </div>
                    ))}
                    {filteredTasks.filter(i => i.status === col.status).length === 0 && <div className="border-2 border-dashed p-8 text-center text-sm text-muted-foreground rounded-lg">No tasks</div>}
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {/* Room Status Tab */}
        {tab === 'room-status' && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-4">
            {[{label:'Available',value:roomStats.available,color:'text-green-600'},{label:'Occupied',value:roomStats.occupied,color:'text-blue-600'},{label:'Cleaning',value:roomStats.cleaning,color:'text-red-600'},{label:'Maintenance',value:roomStats.maintenance,color:'text-orange-600'},{label:'Total',value:roomStats.total,color:'text-foreground'}].map(s => (
              <Card key={s.label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader><CardContent><p className={cn('text-2xl font-bold', s.color)}>{s.value}</p></CardContent></Card>
            ))}
          </div>
        )}

        {/* Lost & Found Tab */}
        {tab === 'lost-found' && (
          <Card><CardContent className="p-0">
            {lostItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground"><Luggage className="h-12 w-12 mb-3" /><p>No lost items</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Found Date</TableHead><TableHead>Location</TableHead><TableHead>Guest</TableHead><TableHead>Status</TableHead><TableHead className="w-40">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lostItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_description}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{new Date(item.found_date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.found_location}</TableCell>
                      <TableCell>{item.guest_name || '-'}</TableCell>
                      <TableCell><Badge variant={item.status === 'unclaimed' ? 'destructive' : item.status === 'returned' ? 'outline' : 'secondary'}>{item.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 'unclaimed' && (<><Button size="sm" variant="outline" onClick={() => handleLostAction(item.id, 'claimed')}>Claim</Button><Button size="sm" variant="ghost" onClick={() => handleLostAction(item.id, 'disposed')}>Dispose</Button></>)}
                          {item.status === 'claimed' && <Button size="sm" variant="outline" onClick={() => handleLostAction(item.id, 'returned')}>Return</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        )}

        {/* Linen Tab */}
        {tab === 'linen' && (
          <div className="space-y-4">
            <Tabs value={linenTab} onValueChange={setLinenTab}>
              <TabsList>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="laundry">Laundry Tracking</TabsTrigger>
              </TabsList>
              <TabsContent value="stock">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Linen Inventory</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Issue</Button>
                        <Button size="sm" variant="outline"><Package className="h-3 w-3 mr-1" />Return</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>In Stock</TableHead><TableHead>In Laundry</TableHead><TableHead>Damaged</TableHead><TableHead>Total</TableHead><TableHead>Reorder Level</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {linenData.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{l.item}</TableCell>
                            <TableCell className="font-mono font-bold">{l.stock}</TableCell>
                            <TableCell className="font-mono">{l.laundry}</TableCell>
                            <TableCell className="font-mono text-destructive">{l.damaged}</TableCell>
                            <TableCell className="font-mono">{l.total}</TableCell>
                            <TableCell className="font-mono">{l.reorder}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="laundry">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">In Laundry</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">50</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ready for Pickup</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">30</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Delivered Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">200</p></CardContent></Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Productivity Tab */}
        {tab === 'productivity' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rooms Cleaned Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">33</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Time / Room</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">48m</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Quality Score</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">4.3/5</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">On-Time %</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">90%</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Staff Performance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Staff Name</TableHead><TableHead>Rooms Cleaned</TableHead><TableHead>Avg Time</TableHead><TableHead>Quality</TableHead><TableHead>On Time %</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {staffData.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono font-bold">{s.rooms}</TableCell>
                        <TableCell className="font-mono">{s.avgTime}</TableCell>
                        <TableCell><div className="flex items-center gap-1">{Array.from({length:5}, (_,j) => <Star key={j} className={cn('h-3 w-3', j < Math.round(s.quality) ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />)}</div></TableCell>
                        <TableCell className="font-mono">{s.onTime}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Task Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Cleaning Task</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Room *</Label>
                <Select value={newTask.room_id} onValueChange={v => setNewTask(p => ({...p, room_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select room..." /></SelectTrigger>
                  <SelectContent>{rooms.map(r => (<SelectItem key={r.id} value={r.id}>{r.room_number} - {r.room_type} ({r.status})</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Task Type *</Label>
                  <Select value={newTask.task_type} onValueChange={v => setNewTask(p => ({...p, task_type: v}))}>
                    <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                    <SelectContent>
                      {['Regular Cleaning','Deep Cleaning','Post-checkout','Pre-arrival','Maintenance','Linen Change'].map(t => (
                        <SelectItem key={t} value={t.toLowerCase().replaceAll(' ', '-')}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({...p, priority: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['low','medium','high','urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={newTask.notes} onChange={e => setNewTask(p => ({...p, notes: e.target.value}))} placeholder="Special instructions..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Lost Item Dialog */}
        <Dialog open={isLostOpen} onOpenChange={setIsLostOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Lost Item</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Item Description *</Label>
                <Input value={newLostItem.item_description} onChange={e => setNewLostItem(p => ({...p, item_description: e.target.value}))} placeholder="e.g., Black leather wallet" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={newLostItem.category} onValueChange={v => setNewLostItem(p => ({...p, category: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Accessories','Electronics','Clothing','Luggage','Documents','Money/Cards','Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Found Location</Label>
                  <Input value={newLostItem.found_location} onChange={e => setNewLostItem(p => ({...p, found_location: e.target.value}))} placeholder="e.g., Room 305" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Guest Name</Label>
                <Input value={newLostItem.guest_name} onChange={e => setNewLostItem(p => ({...p, guest_name: e.target.value}))} placeholder="If known" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLostOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLost}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
function Shirt(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>; }