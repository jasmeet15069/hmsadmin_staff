import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRooms } from '@/hooks/useRooms';
import { useStaff } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hammer,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Wrench,
} from 'lucide-react';

type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
type WorkOrderPriority = 'urgent' | 'high' | 'normal' | 'low';

interface WorkOrder {
  id: string;
  room_id: string | null;
  reported_by: string;
  assigned_to: string | null;
  category: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  title: string;
  description: string | null;
  resolution_notes: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  resolved_at: string | null;
  reporter?: string | null;
  assignee?: string | null;
  rooms?: { room_number?: string } | null;
}

interface MaintenanceFormState {
  room_id: string;
  assigned_to: string;
  category: string;
  priority: WorkOrderPriority;
  title: string;
  description: string;
  estimated_minutes: string;
  put_room_in_maintenance: boolean;
}

interface ResolutionState {
  resolution_notes: string;
  actual_minutes: string;
  next_room_status: 'maintenance' | 'cleaning' | 'available';
}

const statusLabels: Record<WorkOrderStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const statusColumns: { status: WorkOrderStatus; label: string; helper: string }[] = [
  { status: 'open', label: 'New', helper: 'Needs owner' },
  { status: 'assigned', label: 'Assigned', helper: 'Ready to start' },
  { status: 'in_progress', label: 'In Progress', helper: 'Being fixed' },
];

const categoryOptions = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Furniture',
  'Internet / IT',
  'Appliance',
  'Safety',
  'Other',
];

const priorityLabels: Record<WorkOrderPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const priorityBadgeVariant: Record<WorkOrderPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  urgent: 'destructive',
  high: 'destructive',
  normal: 'secondary',
  low: 'outline',
};

const emptyForm: MaintenanceFormState = {
  room_id: 'general',
  assigned_to: 'unassigned',
  category: 'Other',
  priority: 'normal',
  title: '',
  description: '',
  estimated_minutes: '',
  put_room_in_maintenance: true,
};

const emptyResolution: ResolutionState = {
  resolution_notes: '',
  actual_minutes: '',
  next_room_status: 'cleaning',
};

function formatAge(value: string) {
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return 'Just now';
  const diffMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m old`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h old`;
  return `${Math.round(hours / 24)}d old`;
}

function normalizeStatus(status: string | null | undefined): WorkOrderStatus {
  if (status === 'assigned' || status === 'in_progress' || status === 'resolved' || status === 'closed') return status;
  return 'open';
}

function normalizePriority(priority: string | null | undefined): WorkOrderPriority {
  if (priority === 'urgent' || priority === 'high' || priority === 'low') return priority;
  return 'normal';
}

export default function MaintenancePage() {
  const { user, hasAnyRole } = useAuth();
  const { rooms, refetch: refetchRooms } = useRooms();
  const { staff } = useStaff();
  const { toast } = useToast();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'all' | WorkOrderPriority>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<MaintenanceFormState>(emptyForm);
  const [resolvingOrder, setResolvingOrder] = useState<WorkOrder | null>(null);
  const [resolution, setResolution] = useState<ResolutionState>(emptyResolution);

  const canSeeAllOrders = hasAnyRole(['platform_admin', 'hotel_admin', 'property_manager', 'super_admin', 'admin', 'receptionist']);

  const maintenanceStaff = useMemo(
    () => staff.filter(member => member.roles.some(role => role.role === 'maintenance')),
    [staff],
  );

  const roomsByID = useMemo(
    () => new Map(rooms.map(room => [room.id, room])),
    [rooms],
  );

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('work_orders' as never)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch work orders', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const nextItems = ((data || []) as unknown as WorkOrder[]).map(item => ({
      ...item,
      status: normalizeStatus(item.status),
      priority: normalizePriority(item.priority),
    }));
    setItems(nextItems);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateRoomStatus = async (roomID: string | null, status: 'available' | 'cleaning' | 'maintenance') => {
    if (!roomID) return;
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomID);
    if (error) {
      toast({ title: 'Room status not updated', description: error.message, variant: 'destructive' });
    }
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    const { error } = await supabase.from('work_orders' as never).update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchItems();
    return true;
  };

  const createWorkOrder = async () => {
    if (!user?.id) {
      toast({ title: 'Not signed in', description: 'Please sign in again before creating a work order.', variant: 'destructive' });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: 'Missing title', description: 'Add a short issue title.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const roomID = form.room_id === 'general' ? null : form.room_id;
    const assignedTo = form.assigned_to === 'unassigned' ? null : form.assigned_to;
    const { error } = await supabase.from('work_orders' as never).insert({
      room_id: roomID,
      reported_by: user.id,
      assigned_to: assignedTo,
      category: form.category,
      priority: form.priority,
      status: assignedTo ? 'assigned' : 'open',
      title: form.title.trim(),
      description: form.description.trim() || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    if (roomID && form.put_room_in_maintenance) {
      await updateRoomStatus(roomID, 'maintenance');
      await refetchRooms();
    }

    toast({ title: 'Work order created', description: 'Maintenance can now assign, start, and resolve it.' });
    setForm(emptyForm);
    setIsCreateOpen(false);
    setIsSaving(false);
    await fetchItems();
  };

  const assignToMe = async (item: WorkOrder) => {
    if (!user?.id) return;
    const ok = await updateWorkOrder(item.id, { assigned_to: user.id, status: 'assigned' });
    if (ok) toast({ title: 'Assigned', description: 'This work order is now in your queue.' });
  };

  const startWork = async (item: WorkOrder) => {
    const updates: Partial<WorkOrder> = { status: 'in_progress' };
    if (!item.assigned_to && user?.id) updates.assigned_to = user.id;
    const ok = await updateWorkOrder(item.id, updates);
    if (ok && item.room_id) {
      await updateRoomStatus(item.room_id, 'maintenance');
      await refetchRooms();
    }
  };

  const resolveWork = async () => {
    if (!resolvingOrder) return;
    setIsSaving(true);
    const ok = await updateWorkOrder(resolvingOrder.id, {
      status: 'resolved',
      resolution_notes: resolution.resolution_notes.trim() || null,
      actual_minutes: resolution.actual_minutes ? Number(resolution.actual_minutes) : null,
      resolved_at: new Date().toISOString(),
    });
    if (ok && resolvingOrder.room_id) {
      await updateRoomStatus(resolvingOrder.room_id, resolution.next_room_status);
      await refetchRooms();
    }
    if (ok) {
      toast({ title: 'Work order resolved', description: 'Resolution notes and room readiness were saved.' });
      setResolvingOrder(null);
      setResolution(emptyResolution);
    }
    setIsSaving(false);
  };

  const closeWorkOrder = async (item: WorkOrder) => {
    const ok = await updateWorkOrder(item.id, { status: 'closed' });
    if (ok) toast({ title: 'Closed', description: 'The work order has been archived.' });
  };

  const filtered = items.filter(item => {
    const room = item.room_id ? roomsByID.get(item.room_id) : null;
    const roomText = room ? `${room.room_number} ${room.room_type} floor ${room.floor}` : '';
    const queryText = `${item.title} ${item.category || ''} ${roomText} ${item.description || ''} ${item.assignee || ''}`.toLowerCase();
    const roleVisible = canSeeAllOrders || !item.assigned_to || item.assigned_to === user?.id;
    const priorityVisible = selectedPriority === 'all' || item.priority === selectedPriority;
    return roleVisible && priorityVisible && queryText.includes(search.toLowerCase());
  });

  const activeItems = filtered.filter(item => !['resolved', 'closed'].includes(item.status));
  const historyItems = filtered.filter(item => ['resolved', 'closed'].includes(item.status));
  const urgentCount = activeItems.filter(item => item.priority === 'urgent' || item.priority === 'high').length;
  const inProgressCount = activeItems.filter(item => item.status === 'in_progress').length;
  const resolvedTodayCount = historyItems.filter(item => {
    if (!item.resolved_at) return false;
    return new Date(item.resolved_at).toDateString() === new Date().toDateString();
  }).length;

  const renderRoomLabel = (item: WorkOrder) => {
    if (!item.room_id) return 'General property issue';
    const room = roomsByID.get(item.room_id);
    if (!room) return `Room ${item.rooms?.room_number || item.room_id}`;
    return `Room ${room.room_number} - ${room.room_type} - Floor ${room.floor}`;
  };

  const renderWorkOrderCard = (item: WorkOrder) => (
    <div key={item.id} className="border-2 bg-card p-4 shadow-[4px_4px_0_0_#000]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-base font-bold">{item.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{renderRoomLabel(item)}</p>
        </div>
        <Badge variant={priorityBadgeVariant[item.priority]} className="shrink-0">
          {priorityLabels[item.priority]}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span>{item.category || 'Other'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{item.estimated_minutes ? `${item.estimated_minutes} min estimate` : formatAge(item.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span>{item.assignee || (item.assigned_to ? 'Assigned' : 'Unassigned')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-2">
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      {item.description && <p className="mt-3 border-l-2 border-border pl-3 text-sm">{item.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {!item.assigned_to && user?.id && (
          <Button size="sm" variant="outline" onClick={() => assignToMe(item)}>
            Assign to me
          </Button>
        )}
        {(item.status === 'open' || item.status === 'assigned') && (
          <Button size="sm" onClick={() => startWork(item)}>
            Start work
          </Button>
        )}
        {item.status === 'in_progress' && (
          <Button size="sm" onClick={() => setResolvingOrder(item)}>
            Resolve
          </Button>
        )}
        {item.status === 'resolved' && (
          <Button size="sm" variant="outline" onClick={() => closeWorkOrder(item)}>
            Close
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Maintenance</h2>
            <p className="text-muted-foreground">
              {activeItems.length} active work orders - assign, repair, resolve, and release rooms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchItems} aria-label="Refresh maintenance">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="border-2 bg-card p-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-3xl font-bold">{activeItems.length}</p>
          </div>
          <div className="border-2 bg-card p-4">
            <p className="text-sm text-muted-foreground">Urgent / High</p>
            <p className="text-3xl font-bold text-destructive">{urgentCount}</p>
          </div>
          <div className="border-2 bg-card p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-3xl font-bold">{inProgressCount}</p>
          </div>
          <div className="border-2 bg-card p-4">
            <p className="text-sm text-muted-foreground">Resolved Today</p>
            <p className="text-3xl font-bold text-green-700">{resolvedTodayCount}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search room, issue, assignee, or category..." className="border-2 pl-9" />
          </div>
          <Select value={selectedPriority} onValueChange={value => setSelectedPriority(value as 'all' | WorkOrderPriority)}>
            <SelectTrigger className="w-full border-2 lg:w-48">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <section className="grid gap-4 lg:grid-cols-3">
              {statusColumns.map(column => {
                const columnItems = activeItems.filter(item => item.status === column.status);
                return (
                  <div key={column.status} className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-border pb-2">
                      <div>
                        <h3 className="font-bold">{column.label}</h3>
                        <p className="text-xs text-muted-foreground">{column.helper}</p>
                      </div>
                      <Badge variant="secondary">{columnItems.length}</Badge>
                    </div>
                    {columnItems.map(renderWorkOrderCard)}
                    {columnItems.length === 0 && (
                      <div className="border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        <Hammer className="mx-auto mb-3 h-7 w-7" />
                        No work orders
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-border pb-2">
                <div>
                  <h3 className="font-bold">Recently Resolved</h3>
                  <p className="text-xs text-muted-foreground">Close completed jobs after review</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              {historyItems.slice(0, 8).map(item => (
                <div key={item.id} className="border-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{renderRoomLabel(item)}</p>
                    </div>
                    <Badge variant="outline" className="border-2">
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                  {item.resolution_notes && <p className="mt-2 text-xs text-muted-foreground">{item.resolution_notes}</p>}
                  {item.status === 'resolved' && (
                    <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => closeWorkOrder(item)}>
                      Close
                    </Button>
                  )}
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-2 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Log a maintenance issue, assign it, and optionally put the room out of service.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Room / Area</Label>
              <Select value={form.room_id} onValueChange={value => setForm(prev => ({ ...prev, room_id: value }))}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General property issue</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.room_number} - {room.room_type} - Floor {room.floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assigned_to} onValueChange={value => setForm(prev => ({ ...prev, assigned_to: value }))}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned queue</SelectItem>
                  {maintenanceStaff.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={value => setForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={value => setForm(prev => ({ ...prev, priority: value as WorkOrderPriority }))}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent - guest safety / room down</SelectItem>
                  <SelectItem value="high">High - affects guest comfort</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Issue Title</Label>
              <Input
                className="border-2"
                value={form.title}
                onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                placeholder="AC not cooling, leaking tap, broken lock..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                className="min-h-24 border-2"
                value={form.description}
                onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
                placeholder="What needs to be checked or repaired?"
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Time (min)</Label>
              <Input
                className="border-2"
                type="number"
                min="0"
                value={form.estimated_minutes}
                onChange={event => setForm(prev => ({ ...prev, estimated_minutes: event.target.value }))}
                placeholder="30"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-2 p-3">
              <div>
                <Label>Put room in maintenance</Label>
                <p className="text-xs text-muted-foreground">Blocks front desk from selling this room.</p>
              </div>
              <Switch
                checked={form.put_room_in_maintenance}
                onCheckedChange={checked => setForm(prev => ({ ...prev, put_room_in_maintenance: checked }))}
                disabled={form.room_id === 'general'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createWorkOrder} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolvingOrder} onOpenChange={open => !open && setResolvingOrder(null)}>
        <DialogContent className="border-2 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Work Order</DialogTitle>
            <DialogDescription>
              Add repair notes and choose what should happen to the room after maintenance.
            </DialogDescription>
          </DialogHeader>

          {resolvingOrder && (
            <div className="space-y-4">
              <div className="border-2 p-3">
                <p className="font-bold">{resolvingOrder.title}</p>
                <p className="text-sm text-muted-foreground">{renderRoomLabel(resolvingOrder)}</p>
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  className="min-h-24 border-2"
                  value={resolution.resolution_notes}
                  onChange={event => setResolution(prev => ({ ...prev, resolution_notes: event.target.value }))}
                  placeholder="What was repaired or replaced?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Actual Time (min)</Label>
                  <Input
                    className="border-2"
                    type="number"
                    min="0"
                    value={resolution.actual_minutes}
                    onChange={event => setResolution(prev => ({ ...prev, actual_minutes: event.target.value }))}
                    placeholder="25"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Room After Fix</Label>
                  <Select
                    value={resolution.next_room_status}
                    onValueChange={value => setResolution(prev => ({ ...prev, next_room_status: value as ResolutionState['next_room_status'] }))}
                    disabled={!resolvingOrder.room_id}
                  >
                    <SelectTrigger className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Send to cleaning</SelectItem>
                      <SelectItem value="available">Ready / available</SelectItem>
                      <SelectItem value="maintenance">Keep in maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {resolution.next_room_status === 'available' && (
                <div className="flex gap-2 border-2 border-amber-500 bg-amber-50 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                  Use Available only after the room is safe and does not need housekeeping inspection.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={resolveWork} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
