import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Search, Wrench } from 'lucide-react';

type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface WorkOrder {
  id: string;
  room_id: string | null;
  assigned_to: string | null;
  category: string | null;
  priority: string;
  status: WorkOrderStatus;
  title: string;
  description: string | null;
  created_at: string;
  resolved_at: string | null;
  rooms?: { room_number?: string } | null;
}

const statusLabels: Record<WorkOrderStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function MaintenancePage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('work_orders' as never)
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data || []) as unknown as WorkOrder[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateStatus = async (id: string, status: WorkOrderStatus) => {
    await supabase.from('work_orders' as never).update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
    await fetchItems();
  };

  const filtered = items.filter(item => {
    const room = item.rooms?.room_number || '';
    return `${item.title} ${item.category || ''} ${room}`.toLowerCase().includes(search.toLowerCase());
  });

  const activeItems = filtered.filter(item => !['resolved', 'closed'].includes(item.status));
  const historyItems = filtered.filter(item => ['resolved', 'closed'].includes(item.status));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Maintenance</h2>
            <p className="text-muted-foreground">{activeItems.length} open work orders</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchItems} aria-label="Refresh maintenance">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search work orders..." className="border-2 pl-9" />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-3">
              <h3 className="font-bold">Active Work Orders</h3>
              {activeItems.map(item => (
                <div key={item.id} className="border-2 bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Room {item.rooms?.room_number || item.room_id || 'General'} - {item.category || 'Other'}
                      </p>
                    </div>
                    <Badge variant={item.priority === 'urgent' || item.priority === 'high' ? 'destructive' : 'secondary'}>
                      {item.priority}
                    </Badge>
                  </div>
                  {item.description && <p className="mt-3 text-sm">{item.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-2">{statusLabels[item.status]}</Badge>
                    {item.status === 'open' && <Button size="sm" onClick={() => updateStatus(item.id, 'in_progress')}>Start</Button>}
                    {item.status === 'assigned' && <Button size="sm" onClick={() => updateStatus(item.id, 'in_progress')}>Start</Button>}
                    {item.status === 'in_progress' && <Button size="sm" onClick={() => updateStatus(item.id, 'resolved')}>Resolve</Button>}
                  </div>
                </div>
              ))}
              {activeItems.length === 0 && (
                <div className="border-2 border-dashed border-border p-10 text-center text-muted-foreground">
                  <Wrench className="mx-auto mb-3 h-7 w-7" />
                  No active work orders
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-bold">Recently Resolved</h3>
              {historyItems.slice(0, 6).map(item => (
                <div key={item.id} className="border-2 p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{statusLabels[item.status]}</p>
                </div>
              ))}
              {historyItems.length === 0 && (
                <div className="border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No resolved work orders yet
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
