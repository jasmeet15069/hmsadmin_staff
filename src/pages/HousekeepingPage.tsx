import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Search, Sparkles } from 'lucide-react';

type AssignmentStatus = 'pending' | 'in_progress' | 'done' | 'inspected';

interface HousekeepingAssignment {
  id: string;
  room_id: string;
  assigned_to: string | null;
  task_type: string;
  priority: string;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  rooms?: { room_number?: string; room_type?: string | null; floor?: number | null } | null;
  profiles?: { full_name?: string } | null;
}

const columns: { status: AssignmentStatus; label: string }[] = [
  { status: 'pending', label: 'Dirty / Pending' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
  { status: 'inspected', label: 'Inspected' },
];

export default function HousekeepingPage() {
  const [items, setItems] = useState<HousekeepingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('housekeeping_assignments' as never)
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data || []) as unknown as HousekeepingAssignment[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateStatus = async (id: string, status: AssignmentStatus) => {
    await supabase.from('housekeeping_assignments' as never).update({ status }).eq('id', id);
    await fetchItems();
  };

  const filtered = items.filter(item => {
    const room = item.rooms?.room_number || '';
    return room.toLowerCase().includes(search.toLowerCase()) || item.task_type.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Housekeeping</h2>
            <p className="text-muted-foreground">
              {items.filter(i => i.status !== 'inspected').length} active room tasks
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchItems} aria-label="Refresh housekeeping">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search room or task..." className="border-2 pl-9" />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {columns.map(column => {
              const columnItems = filtered.filter(item => item.status === column.status);
              return (
                <section key={column.status} className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-border pb-2">
                    <h3 className="font-bold">{column.label}</h3>
                    <Badge variant="secondary">{columnItems.length}</Badge>
                  </div>

                  {columnItems.map(item => (
                    <div key={item.id} className="border-2 bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-lg font-bold">Room {item.rooms?.room_number || item.room_id}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.task_type.replaceAll('_', ' ')} - {item.priority}
                          </p>
                        </div>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {item.notes && <p className="mt-3 border-l-2 border-border pl-3 text-sm">{item.notes}</p>}
                      <div className="mt-4 flex gap-2">
                        {item.status === 'pending' && <Button size="sm" onClick={() => updateStatus(item.id, 'in_progress')}>Start</Button>}
                        {item.status === 'in_progress' && <Button size="sm" onClick={() => updateStatus(item.id, 'done')}>Done</Button>}
                        {item.status === 'done' && <Button size="sm" onClick={() => updateStatus(item.id, 'inspected')}>Inspect</Button>}
                      </div>
                    </div>
                  ))}

                  {columnItems.length === 0 && (
                    <div className="border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
