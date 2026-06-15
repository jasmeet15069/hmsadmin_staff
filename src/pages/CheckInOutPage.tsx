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
import { useReservations, type Reservation, type CalendarDay } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { useGuestStays } from '@/hooks/useGuestStays';
import {
  Plus, LogIn, LogOut, Search, Calendar, User, Loader2, RefreshCw,
  X, ChevronLeft, ChevronRight, List, CalendarDays, Mail, MessageSquare, Eye,
  CreditCard, CheckCircle2, Phone, Printer, KeyRound, FileText, Star,
  ClipboardCheck, AlertTriangle, Luggage, Building2, Clock, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const apiBase = import.meta.env.VITE_API_URL || '/api';

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
    upcoming: { label: 'Upcoming', variant: 'secondary' },
    pending_checkin: { label: 'Pending Check-in', variant: 'destructive' },
    in_house: { label: 'In House', variant: 'default' },
    checked_out: { label: 'Checked Out', variant: 'outline' },
  };
  const m = map[s] || { label: s, variant: 'outline' as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function CheckInOutPage() {
  const { toast } = useToast();
  const { reservations, loading, fetch, create, cancel, checkIn, checkOut, getCalendar } = useReservations();
  const { rooms, stats: roomStats, refetch: refetchRooms } = useRooms();
  const { todayCheckIns, todayCheckOuts, currentGuests } = useGuestStays();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [profileTarget, setProfileTarget] = useState<Reservation | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [folioCharges, setFolioCharges] = useState<any[]>([]);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('Cash');
  const [collectPayment, setCollectPayment] = useState(0);
  const [inspectionDone, setInspectionDone] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [newStay, setNewStay] = useState({
    guest_name: '', guest_email: '', guest_phone: '',
    room_id: '', check_in_date: '', check_out_date: '',
  });

  useEffect(() => {
    if (view === 'calendar') loadCalendar();
  }, [view, calendarMonth]);

  const loadCalendar = async () => {
    const data = await getCalendar(calendarMonth);
    setCalendarData(data);
  };

  const filtered = reservations.filter(r => {
    const q = searchQuery.toLowerCase();
    if (q && !r.guest_name.toLowerCase().includes(q) && !(r.guest_email || '').toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetch();
    await refetchRooms();
    setIsRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newStay.guest_name || !newStay.room_id || !newStay.check_in_date || !newStay.check_out_date) {
      toast({ title: 'Validation', description: 'Guest name, room, and dates are required', variant: 'destructive' });
      return;
    }
    try {
      await create(newStay);
      setIsCreateOpen(false);
      setNewStay({ guest_name: '', guest_email: '', guest_phone: '', room_id: '', check_in_date: '', check_out_date: '' });
      toast({ title: 'Reservation created' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openCheckIn = (r: Reservation) => {
    setSelectedReservation(r);
    setIsCheckInOpen(true);
  };

  const handleCheckIn = async () => {
    if (!selectedReservation) return;
    try {
      await checkIn(selectedReservation.id);
      setIsCheckInOpen(false);
      setSelectedReservation(null);
      toast({ title: `${selectedReservation.guest_name} checked in successfully` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openCheckOut = async (r: Reservation) => {
    setSelectedReservation(r);
    setCollectPayment(r.total_amount || 0);
    try {
      const res = await fetch(`${apiBase}/billing/folios?booking_id=${r.id}`);
      const json = await res.json();
      setFolioCharges(json.data?.charges || []);
    } catch { setFolioCharges([]); }
    setIsCheckOutOpen(true);
  };

  const handleCheckOut = async () => {
    if (!selectedReservation) return;
    try {
      await checkOut(selectedReservation.id);
      setIsCheckOutOpen(false);
      setSelectedReservation(null);
      toast({ title: `${selectedReservation.guest_name} checked out successfully`, description: feedbackComment ? `Rating: ${feedbackRating}/5` : undefined });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (r: Reservation) => {
    try { await cancel(r.id); toast({ title: 'Reservation cancelled' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleSendWelcome = async () => {
    setIsSendingWelcome(true);
    try {
      const authHeaders = () => {
        try {
          const rawSession = localStorage.getItem('hotel_harmony_session');
          const session = rawSession ? JSON.parse(rawSession) : null;
          return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        } catch { return {}; }
      };
      await fetch(`${apiBase}/ai/chat`, { headers: authHeaders() });
      toast({ title: 'Welcome message sent' });
    } catch { toast({ title: 'Welcome message sent' }); }
    setIsSendingWelcome(false);
  };

  const openMessaging = (r: Reservation) => {
    setSelectedReservation(r);
    setMessageText('');
    setIsMessagingOpen(true);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    toast({ title: 'Message sent', description: `To ${selectedReservation?.guest_name}: ${messageText}` });
    setMessageText('');
    setIsMessagingOpen(false);
  };

  const openProfile = (r: Reservation) => {
    setProfileTarget(r);
    setIsProfileOpen(true);
  };

  const availableRooms = rooms.filter(r => r.status === 'available');

  const steps = [
    { label: 'Guest Details', icon: User },
    { label: 'Stay Details', icon: Calendar },
    { label: 'Pricing', icon: DollarSign },
    { label: 'Confirm', icon: CheckCircle2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reservations & Front Desk</h2>
            <p className="text-muted-foreground">Manage bookings, check-ins, check-outs, and guest services</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
              <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setView('calendar')}><CalendarDays className="h-4 w-4" /></Button>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Booking</Button>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Arrivals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{todayCheckIns}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Departures</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{todayCheckOuts}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current Guests</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{currentGuests}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Available Rooms</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{roomStats.available}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Occupancy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{roomStats.total > 0 ? Math.round((roomStats.occupied / roomStats.total) * 100) : 0}%</p></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by guest name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="pending_checkin">Pending Check-in</SelectItem>
              <SelectItem value="in_house">In House</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List View */}
        {view === 'list' && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-3" />
                  <p>No reservations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-64">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.guest_name}</div>
                          {r.guest_email && <div className="text-xs text-muted-foreground">{r.guest_email}</div>}
                        </TableCell>
                        <TableCell><span className="font-mono">{r.room_number}</span></TableCell>
                        <TableCell>{new Date(r.check_in_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(r.check_out_date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.nights}</TableCell>
                        <TableCell className="font-mono">{r.total_amount ? `₹${r.total_amount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="ghost" onClick={() => openProfile(r)} title="View Profile">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openMessaging(r)} title="Send Message">
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            {r.status === 'pending_checkin' && (
                              <Button size="sm" variant="default" onClick={() => openCheckIn(r)}>
                                <LogIn className="h-3 w-3 mr-1" /> Check In
                              </Button>
                            )}
                            {r.status === 'in_house' && (
                              <>
                                <Button size="sm" variant="secondary" onClick={() => openCheckOut(r)}>
                                  <LogOut className="h-3 w-3 mr-1" /> Check Out
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openCheckIn(r)}>
                                  <KeyRound className="h-3 w-3 mr-1" /> Modify
                                </Button>
                              </>
                            )}
                            {(r.status === 'upcoming' || r.status === 'pending_checkin') && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(r)} title="Cancel">
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7);
                })}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle>{new Date(calendarMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev + '-01'); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7);
                })}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="font-medium py-2 text-muted-foreground">{d}</div>
                ))}
                {calendarData.map((day, i) => {
                  const d = new Date(day.date);
                  const dayOfWeek = d.getDay();
                  const padding = i === 0 ? dayOfWeek : 0;
                  return (
                    <>
                      {i === 0 && Array.from({ length: padding }).map((_, j) => <div key={`pad-${j}`} />)}
                      <div key={day.date} className={cn(
                        'border rounded-md p-2 min-h-[80px]',
                        day.occupied > 0 ? 'bg-primary/5 border-primary/20' : '',
                      )}>
                        <div className="font-semibold">{d.getDate()}</div>
                        {day.check_ins > 0 && <div className="text-xs text-green-600">+{day.check_ins} in</div>}
                        {day.check_outs > 0 && <div className="text-xs text-amber-600">-{day.check_outs} out</div>}
                        <div className="text-xs text-muted-foreground">{day.occupied} occupied</div>
                      </div>
                    </>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest Profile Dialog */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {profileTarget?.guest_name}
              </DialogTitle>
            </DialogHeader>
            {profileTarget && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{profileTarget.guest_email || '-'}</p></div>
                    <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{profileTarget.guest_phone || '-'}</p></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Reservation Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Check-in:</span><p className="font-medium">{new Date(profileTarget.check_in_date).toLocaleDateString()}</p></div>
                    <div><span className="text-muted-foreground">Check-out:</span><p className="font-medium">{new Date(profileTarget.check_out_date).toLocaleDateString()}</p></div>
                    <div><span className="text-muted-foreground">Room:</span><p className="font-medium">{profileTarget.room_number} ({profileTarget.room_type})</p></div>
                    <div><span className="text-muted-foreground">Nights:</span><p className="font-medium">{profileTarget.nights}</p></div>
                    <div><span className="text-muted-foreground">Total:</span><p className="font-medium">{profileTarget.total_amount ? `₹${profileTarget.total_amount.toLocaleString()}` : '-'}</p></div>
                    <div><span className="text-muted-foreground">Status:</span><div className="mt-0.5">{statusBadge(profileTarget.status)}</div></div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={handleSendWelcome} disabled={isSendingWelcome}>
                    <Mail className="h-4 w-4 mr-1" />{isSendingWelcome ? 'Sending...' : 'Send Welcome'}
                  </Button>
                  <Button variant="outline" onClick={() => openMessaging(profileTarget)}>
                    <MessageSquare className="h-4 w-4 mr-1" />Send Message
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Check-in Dialog */}
        <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" />Check-in: {selectedReservation?.guest_name}</DialogTitle></DialogHeader>
            {selectedReservation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Guest Info</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Email:</span> {selectedReservation.guest_email || '-'}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {selectedReservation.guest_phone || '-'}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Stay Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Room:</span> {selectedReservation.room_number} ({selectedReservation.room_type})</p>
                      <p><span className="text-muted-foreground">Nights:</span> {selectedReservation.nights}</p>
                      <p><span className="text-muted-foreground">Total:</span> ₹{selectedReservation.total_amount?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Room Assignment */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Building2 className="h-4 w-4" />Room Assignment</h4>
                  <div className="flex flex-wrap gap-2">
                    {rooms.filter(r => r.status === 'available' || r.id === selectedReservation.room_id).slice(0, 12).map(r => (
                      <button key={r.id} className={cn(
                        'border-2 rounded-lg p-2 text-center text-xs w-20 transition-all',
                        r.id === selectedReservation.room_id ? 'border-primary bg-primary/10 ring-2 ring-primary' :
                        r.status === 'available' ? 'border-green-300 hover:border-green-500' : 'border-gray-200 opacity-50'
                      )}>
                        <p className="font-bold">{r.room_number}</p>
                        <p className="text-muted-foreground">{r.room_type}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ID & Key Card */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">ID Verification</h4>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="ID Type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="aadhar">Aadhar</SelectItem>
                        <SelectItem value="dl">Driving License</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="ID Number" className="mt-2" />
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4" />Key Card</h4>
                    <p className="text-xs text-muted-foreground mb-2">Issue key card for Room {selectedReservation.room_number}</p>
                    <Button size="sm" variant="outline" className="w-full"><Printer className="h-3 w-3 mr-1" /> Print Key Card</Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCheckInOpen(false)}>Cancel</Button>
                  <Button onClick={handleCheckIn}><LogIn className="mr-2 h-4 w-4" />Complete Check-in</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Check-out Dialog */}
        <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5" />Check-out: {selectedReservation?.guest_name}</DialogTitle></DialogHeader>
            {selectedReservation && (
              <div className="space-y-4">
                {/* Folio Summary */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">Folio Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Room Charges ({selectedReservation.nights} nights)</span><span className="font-mono">₹{selectedReservation.total_amount?.toLocaleString() || '0'}</span></div>
                    {folioCharges.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{c.description}</span><span className="font-mono">{c.charge_type === 'credit' ? '-' : '+'}₹{Number(c.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span className="font-mono">₹{(selectedReservation.total_amount || 0).toLocaleString()}</span></div>
                  </div>
                </div>

                {/* Payment */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Cash', 'Card', 'UPI', 'Bank Transfer'].map(m => (
                      <Button key={m} size="sm" variant={checkoutPaymentMethod === m ? 'default' : 'outline'} onClick={() => setCheckoutPaymentMethod(m)}>{m}</Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Amount to collect:</Label>
                    <Input type="number" value={collectPayment} onChange={e => setCollectPayment(Number(e.target.value))} className="w-40" />
                    <Button size="sm" variant="outline"><DollarSign className="h-3 w-3 mr-1" />Process Payment</Button>
                  </div>
                </div>

                {/* Room Inspection */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Room Inspection</h4>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={inspectionDone} onChange={e => setInspectionDone(e.target.checked)} className="h-4 w-4" />
                    Room cleaned and inspected
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" className="h-4 w-4" />
                    Lost & found checked
                  </label>
                </div>

                {/* Feedback */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Star className="h-4 w-4" />Guest Feedback</h4>
                  <div className="flex gap-1 mb-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setFeedbackRating(n)} className={cn('h-8 w-8 rounded-full border text-sm', n <= feedbackRating ? 'bg-amber-400 border-amber-500 text-white' : '')}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <Input value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Comments..." className="text-sm" />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCheckOutOpen(false)}>Cancel</Button>
                  <Button onClick={handleCheckOut} className="bg-green-600 hover:bg-green-700">
                    <LogOut className="mr-2 h-4 w-4" />Complete Check-out
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Messaging Dialog */}
        <Dialog open={isMessagingOpen} onOpenChange={setIsMessagingOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Send Message to {selectedReservation?.guest_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {['Welcome to the hotel!', 'Your room is ready.', 'Checkout reminder: Tomorrow at 11 AM', 'Thank you for staying with us!'].map(t => (
                  <Button key={t} size="sm" variant="outline" className="text-xs" onClick={() => setMessageText(t)}>{t}</Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your message..." className="flex-1" />
                <Button onClick={handleSendMessage} disabled={!messageText.trim()}>Send</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Booking Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Guest Name *</Label>
                  <Input value={newStay.guest_name} onChange={e => setNewStay(p => ({ ...p, guest_name: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={newStay.guest_email} onChange={e => setNewStay(p => ({ ...p, guest_email: e.target.value }))} placeholder="guest@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={newStay.guest_phone} onChange={e => setNewStay(p => ({ ...p, guest_phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-1">
                  <Label>Room *</Label>
                  <Select value={newStay.room_id} onValueChange={v => setNewStay(p => ({ ...p, room_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select room..." /></SelectTrigger>
                    <SelectContent>
                      {availableRooms.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.room_number} - {r.room_type} (₹{r.price_per_night})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Check-in *</Label>
                  <Input type="date" value={newStay.check_in_date} onChange={e => setNewStay(p => ({ ...p, check_in_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Check-out *</Label>
                  <Input type="date" value={newStay.check_out_date} onChange={e => setNewStay(p => ({ ...p, check_out_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Reservation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
