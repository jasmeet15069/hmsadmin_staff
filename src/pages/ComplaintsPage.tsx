import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComplaintAnalysisPanel } from '@/components/ai/ComplaintAnalysisPanel';
import { useComplaints } from '@/hooks/useComplaints';
import { Plus, Search, Clock, User, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'critical';

const priorityColors: Record<Priority, string> = {
  low: 'border-muted-foreground bg-muted text-muted-foreground',
  medium: 'border-amber-600 bg-amber-50 text-amber-800',
  high: 'border-orange-600 bg-orange-50 text-orange-800',
  critical: 'border-destructive bg-destructive/10 text-destructive',
};

const statusColors: Record<ComplaintStatus, string> = {
  open: 'border-destructive bg-destructive/10 text-destructive',
  in_progress: 'border-amber-600 bg-amber-50 text-amber-800',
  resolved: 'border-green-600 bg-green-50 text-green-800',
  closed: 'border-muted-foreground bg-muted text-muted-foreground',
};

export default function ComplaintsPage() {
  const { complaints, isLoading, refetch, updateComplaint, resolveComplaint, deleteComplaint, stats } = useComplaints();
  const [selectedComplaint, setSelectedComplaint] = useState<typeof complaints[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolution, setResolution] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredComplaints = complaints.filter(c => {
    const guestName = c.guest_stays?.guest_name || 'Walk-in';
    const roomNumber = c.guest_stays?.rooms?.room_number || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = guestName.toLowerCase().includes(query) ||
      c.complaint_number.toLowerCase().includes(query) ||
      roomNumber.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleMarkInProgress = async () => {
    if (!selectedComplaint) return;
    const success = await updateComplaint(selectedComplaint.id, { status: 'in_progress' });
    if (success) setSelectedComplaint(null);
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    const success = await resolveComplaint(selectedComplaint.id, resolution || 'Resolved by staff');
    if (success) {
      setSelectedComplaint(null);
      setResolution('');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteComplaint(id);
    if (selectedComplaint?.id === id) setSelectedComplaint(null);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
            <h2 className="text-2xl font-bold tracking-tight">Complaints</h2>
            <p className="text-muted-foreground">
              {stats.open} open | {stats.inProgress} in progress | {stats.critical} critical
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh complaints" title="Refresh complaints">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Complaint
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-2 border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Open</p>
            <p className="text-3xl font-bold text-destructive">{stats.open}</p>
          </div>
          <div className="border-2 border-amber-600 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">In Progress</p>
            <p className="text-3xl font-bold text-amber-800">{stats.inProgress}</p>
          </div>
          <div className="border-2 border-red-700 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Critical Pending</p>
            <p className="text-3xl font-bold text-red-800">{stats.critical}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 border-2">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filteredComplaints.map(complaint => {
            const guestName = complaint.guest_stays?.guest_name || 'Walk-in';
            const roomNumber = complaint.guest_stays?.rooms?.room_number || 'N/A';

            return (
              <div
                key={complaint.id}
                className={cn(
                  'cursor-pointer border-2 p-4 transition-all hover:shadow-sm',
                  complaint.priority === 'critical' && complaint.status === 'open' && 'border-destructive'
                )}
                onClick={() => {
                  setSelectedComplaint(complaint);
                  setResolution(complaint.resolution || '');
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold">{complaint.complaint_number}</span>
                      <Badge className={cn('border-2', priorityColors[complaint.priority as Priority])}>
                        {complaint.priority.toUpperCase()}
                      </Badge>
                      <Badge className={cn('border-2', statusColors[complaint.status as ComplaintStatus])}>
                        {complaint.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {guestName}
                      </span>
                      <span>Room {roomNumber}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getTimeAgo(complaint.created_at)}
                      </span>
                    </div>

                    <p className="text-sm">{complaint.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{complaint.category}</Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Delete complaint"
                      title="Delete complaint"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(complaint.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredComplaints.length === 0 && (
            <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              No complaints found
            </div>
          )}
        </div>

        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="border-2 max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedComplaint?.complaint_number}
                {selectedComplaint && (
                  <Badge className={cn('border-2', priorityColors[selectedComplaint.priority as Priority])}>
                    {selectedComplaint.priority.toUpperCase()}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedComplaint && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Guest</p>
                    <p className="font-medium">{selectedComplaint.guest_stays?.guest_name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Room</p>
                    <p className="font-medium">{selectedComplaint.guest_stays?.rooms?.room_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedComplaint.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{getTimeAgo(selectedComplaint.created_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 border-l-2 border-border pl-3">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.resolution && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="mt-1 border-l-2 border-green-600 bg-green-50 p-2 text-sm">
                      {selectedComplaint.resolution}
                    </p>
                  </div>
                )}

                {selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'closed' && (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-sm font-medium">Add Resolution</p>
                      <Textarea
                        placeholder="Enter resolution details..."
                        className="border-2"
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                      />
                    </div>

                    <ComplaintAnalysisPanel
                      description={selectedComplaint.description}
                      category={selectedComplaint.category}
                      onAnalysisComplete={(analysis) => {
                        console.log('Apply AI suggestions:', analysis);
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedComplaint.status === 'open' && (
                    <Button className="flex-1" onClick={handleMarkInProgress}>Mark In Progress</Button>
                  )}
                  {selectedComplaint.status === 'in_progress' && (
                    <Button className="flex-1" onClick={handleResolve}>Mark Resolved</Button>
                  )}
                  <Button variant="outline" onClick={() => handleDelete(selectedComplaint.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
