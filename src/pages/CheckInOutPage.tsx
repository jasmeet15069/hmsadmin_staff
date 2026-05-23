import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGuestStays } from '@/hooks/useGuestStays';
import { useRooms } from '@/hooks/useRooms';
import { Plus, LogIn, LogOut, Search, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CheckInOutPage() {
  const { stays, isLoading, checkIn, checkOut, createStay, todayCheckIns, todayCheckOuts, currentGuests, refetch: refetchStays } = useGuestStays();
  const { rooms, stats: roomStats, refetch: refetchRooms } = useRooms();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending_checkin' | 'pending_checkout' | 'current'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newStay, setNewStay] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    room_id: '',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const filteredStays = stays.filter(stay => {
    const matchesSearch = stay.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stay.rooms?.room_number?.includes(searchQuery);

    if (filterType === 'pending_checkin') {
      return matchesSearch && stay.check_in_date <= today && !stay.actual_check_in;
    }
    if (filterType === 'pending_checkout') {
      return matchesSearch && stay.check_out_date <= today && stay.actual_check_in && !stay.actual_check_out;
    }
    if (filterType === 'current') {
      return matchesSearch && stay.actual_check_in && !stay.actual_check_out;
    }
    return matchesSearch;
  });

  const availableRooms = rooms.filter(r => r.status === 'available');

  const handleCreateStay = async () => {
    if (!newStay.guest_name || !newStay.room_id || !newStay.check_in_date || !newStay.check_out_date) return;
    
    const success = await createStay({
      guest_name: newStay.guest_name,
      guest_email: newStay.guest_email || null,
      guest_phone: newStay.guest_phone || null,
      room_id: newStay.room_id,
      check_in_date: newStay.check_in_date,
      check_out_date: newStay.check_out_date,
    });

    if (success) {
      setIsCreateOpen(false);
      setNewStay({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        room_id: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: '',
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStays(), refetchRooms()]);
    setIsRefreshing(false);
  };

  const getStatusBadge = (stay: typeof stays[0]) => {
    if (stay.actual_check_out) {
      return <Badge variant="outline" className="border-muted-foreground">Checked Out</Badge>;
    }
    if (stay.actual_check_in) {
      return <Badge className="bg-green-600">In House</Badge>;
    }
    if (stay.check_in_date <= today) {
      return <Badge variant="destructive">Pending Check-in</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
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
            <h2 className="text-2xl font-bold tracking-tight">Guests / Bookings</h2>
            <p className="text-muted-foreground">
              {todayCheckIns} arrivals • {todayCheckOuts} departures • {currentGuests} current guests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh bookings" title="Refresh bookings">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2">
              <DialogHeader>
                <DialogTitle>Create Guest Booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Guest Name *</Label>
                  <Input
                    value={newStay.guest_name}
                    onChange={(e) => setNewStay({ ...newStay, guest_name: e.target.value })}
                    className="mt-1 border-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newStay.guest_email}
                      onChange={(e) => setNewStay({ ...newStay, guest_email: e.target.value })}
                      className="mt-1 border-2"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newStay.guest_phone}
                      onChange={(e) => setNewStay({ ...newStay, guest_phone: e.target.value })}
                      className="mt-1 border-2"
                    />
                  </div>
                </div>
                <div>
                  <Label>Room *</Label>
                  <Select
                    value={newStay.room_id}
                    onValueChange={(v) => setNewStay({ ...newStay, room_id: v })}
                  >
                    <SelectTrigger className="mt-1 border-2">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.room_number} - {room.room_type} (${room.price_per_night}/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableRooms.length === 0 && (
                    <p className="mt-1 text-sm text-destructive">No rooms available</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in Date *</Label>
                    <Input
                      type="date"
                      value={newStay.check_in_date}
                      onChange={(e) => setNewStay({ ...newStay, check_in_date: e.target.value })}
                      className="mt-1 border-2"
                    />
                  </div>
                  <div>
                    <Label>Check-out Date *</Label>
                    <Input
                      type="date"
                      value={newStay.check_out_date}
                      min={newStay.check_in_date}
                      onChange={(e) => setNewStay({ ...newStay, check_out_date: e.target.value })}
                      className="mt-1 border-2"
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateStay}>
                  Create Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="border-2 border-primary bg-primary/5 p-4">
            <p className="text-sm font-medium">Today's Arrivals</p>
            <p className="text-3xl font-bold">{todayCheckIns}</p>
          </div>
          <div className="border-2 border-amber-600 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Today's Departures</p>
            <p className="text-3xl font-bold text-amber-800">{todayCheckOuts}</p>
          </div>
          <div className="border-2 border-green-600 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">Current Guests</p>
            <p className="text-3xl font-bold text-green-800">{currentGuests}</p>
          </div>
          <div className="border-2 border-border p-4">
            <p className="text-sm font-medium">Available Rooms</p>
            <p className="text-3xl font-bold">{roomStats.available}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by guest name or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v: typeof filterType) => setFilterType(v)}>
            <SelectTrigger className="w-48 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending_checkin">Pending Check-in</SelectItem>
              <SelectItem value="pending_checkout">Pending Check-out</SelectItem>
              <SelectItem value="current">Current Guests</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stays Table */}
        <div className="border-2 border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStays.map(stay => (
                <TableRow key={stay.id} className="border-b">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{stay.guest_name}</p>
                        {stay.guest_email && (
                          <p className="text-xs text-muted-foreground">{stay.guest_email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold">
                      {stay.rooms?.room_number || 'N/A'}
                    </span>
                    {stay.rooms?.room_type && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({stay.rooms.room_type})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {stay.check_in_date}
                    </div>
                    {stay.actual_check_in && (
                      <p className="text-xs text-green-600">
                        ✓ {new Date(stay.actual_check_in).toLocaleTimeString()}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {stay.check_out_date}
                    </div>
                    {stay.actual_check_out && (
                      <p className="text-xs text-amber-600">
                        ✓ {new Date(stay.actual_check_out).toLocaleTimeString()}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(stay)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!stay.actual_check_in && stay.check_in_date <= today && (
                        <Button
                          size="sm"
                          onClick={() => checkIn(stay.id)}
                        >
                          <LogIn className="mr-1 h-3 w-3" />
                          Check In
                        </Button>
                      )}
                      {stay.actual_check_in && !stay.actual_check_out && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkOut(stay.id, stay.room_id)}
                        >
                          <LogOut className="mr-1 h-3 w-3" />
                          Check Out
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
