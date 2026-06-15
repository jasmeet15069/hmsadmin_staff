import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2, RefreshCw, Plus, Search, Trash2, CalendarDays, Users, Percent,
  Tag, BedDouble, Ban, CheckCircle2, CreditCard, ArrowRight, Phone, Mail, Check,
} from 'lucide-react';

interface AvailabilityResult {
  room_type: string;
  available: number;
  price_per_night: number;
  currency: string;
}

interface Promotion {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_nights: number;
  valid_from: string;
  valid_to: string;
  usage_limit: number;
  usage_count: number;
  active: boolean;
}

interface Reservation {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type: string;
  room_number?: string;
  check_in: string;
  check_out: string;
  status: string;
  total: number;
  created_at: string;
}

type BookingStep = 'search' | 'guest-info' | 'payment' | 'confirmation';

export default function BookingEnginePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('availability');
  const [loading, setLoading] = useState(false);

  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState(2);
  const [availability, setAvailability] = useState<AvailabilityResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<AvailabilityResult | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newPromo, setNewPromo] = useState({
    code: '', name: '', discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10, min_nights: 1, valid_from: '', valid_to: '', usage_limit: 100,
  });

  const [bookingStep, setBookingStep] = useState<BookingStep>('search');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isBooking, setIsBooking] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/booking/promotions');
      const json = await res.json();
      setPromotions(json.data || []);
    } catch {
      toast({ title: 'Error loading promotions', variant: 'destructive' });
    }
  };

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations');
      const json = await res.json();
      setReservations(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'promotions') fetchPromotions();
    if (tab === 'reservations') fetchReservations();
  }, [tab]);

  const formatDate = (d: Date | undefined) => d ? d.toISOString().split('T')[0] : '';

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      toast({ title: 'Please select check-in and check-out dates', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSearched(true);
    setBookingStep('search');
    try {
      const res = await fetch(`/api/booking/availability?check_in=${formatDate(checkIn)}&check_out=${formatDate(checkOut)}&guests=${guests}`);
      const json = await res.json();
      setAvailability(json.data || []);
    } catch {
      toast({ title: 'Error checking availability', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSelectRoom = (room: AvailabilityResult) => {
    setSelectedRoom(room);
    setBookingStep('guest-info');
  };

  const handleBack = () => {
    if (bookingStep === 'guest-info') setBookingStep('search');
    else if (bookingStep === 'payment') setBookingStep('guest-info');
    else if (bookingStep === 'confirmation') { setBookingStep('search'); setConfirmation(null); setSelectedRoom(null); setGuestName(''); setGuestEmail(''); setGuestPhone(''); setSpecialRequests(''); setPromoCode(''); }
  };

  const handleProceedToPayment = () => {
    if (!guestName || !guestEmail || !guestPhone) {
      toast({ title: 'Please fill in all guest details', variant: 'destructive' });
      return;
    }
    setBookingStep('payment');
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom || !checkIn || !checkOut) return;
    setIsBooking(true);
    try {
      const res = await fetch('/api/booking/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type: selectedRoom.room_type,
          check_in: formatDate(checkIn),
          check_out: formatDate(checkOut),
          guests,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          special_requests: specialRequests,
          promo_code: promoCode,
          payment_method: paymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Booking failed');
      setConfirmation(json.data || json);
      setBookingStep('confirmation');
      toast({ title: 'Booking confirmed!', description: `Reservation for ${guestName} is complete.` });
    } catch (err: any) {
      toast({ title: 'Booking failed', description: err.message, variant: 'destructive' });
    }
    setIsBooking(false);
  };

  const togglePromoActive = async (promo: Promotion) => {
    try {
      await fetch(`/api/booking/promotions/${promo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !promo.active }),
      });
      toast({ title: promo.active ? 'Promotion deactivated' : 'Promotion activated' });
      fetchPromotions();
    } catch {
      toast({ title: 'Error toggling promotion', variant: 'destructive' });
    }
  };

  const deletePromotion = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/booking/promotions/${deleteId}`, { method: 'DELETE' });
      toast({ title: 'Promotion deleted' });
      setDeleteId(null);
      fetchPromotions();
    } catch {
      toast({ title: 'Error deleting promotion', variant: 'destructive' });
    }
  };

  const handleCreatePromotion = async () => {
    if (!newPromo.code || !newPromo.name) {
      toast({ title: 'Code and name are required', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/booking/promotions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPromo),
      });
      if (!res.ok) throw new Error();
      setIsCreateOpen(false);
      setNewPromo({ code: '', name: '', discount_type: 'percentage', discount_value: 10, min_nights: 1, valid_from: '', valid_to: '', usage_limit: 100 });
      fetchPromotions();
      toast({ title: 'Promotion created' });
    } catch {
      toast({ title: 'Error creating promotion', variant: 'destructive' });
    }
  };

  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Booking Engine</h2>
            <p className="text-muted-foreground">Check availability, manage bookings and promotions</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'promotions' && (
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Promotion</Button>
            )}
            <Button variant="outline" size="icon" onClick={() => { if (tab === 'promotions') fetchPromotions(); if (tab === 'reservations') fetchReservations(); else handleCheckAvailability(); }}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="availability"><CalendarDays className="h-4 w-4 mr-1" /> Availability</TabsTrigger>
            <TabsTrigger value="reservations"><BedDouble className="h-4 w-4 mr-1" /> Reservations</TabsTrigger>
            <TabsTrigger value="promotions"><Tag className="h-4 w-4 mr-1" /> Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{bookingStep === 'search' ? 'Search Availability' : bookingStep === 'guest-info' ? 'Guest Information' : bookingStep === 'payment' ? 'Payment' : 'Confirmation'}</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingStep === 'search' && (
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                      <Label>Check-in</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-40 justify-start font-normal', !checkIn && 'text-muted-foreground')}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {checkIn ? checkIn.toLocaleDateString() : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label>Check-out</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-40 justify-start font-normal', !checkOut && 'text-muted-foreground')}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {checkOut ? checkOut.toLocaleDateString() : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label>Guests</Label>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Select value={String(guests)} onValueChange={v => setGuests(parseInt(v))}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleCheckAvailability} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Check Availability
                    </Button>
                  </div>
                )}

                {bookingStep === 'guest-info' && (
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1">
                      <Label>Guest Name *</Label>
                      <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Email *</Label>
                        <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="guest@email.com" />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone *</Label>
                        <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+1 555-0000" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Special Requests</Label>
                      <Textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Extra pillows, late arrival..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Promo Code</Label>
                      <Input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="SUMMER20" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleBack}>Back</Button>
                      <Button onClick={handleProceedToPayment}><ArrowRight className="mr-2 h-4 w-4" /> Continue to Payment</Button>
                    </div>
                  </div>
                )}

                {bookingStep === 'payment' && selectedRoom && (
                  <div className="space-y-4 max-w-lg">
                    <div className="rounded-lg border-2 bg-muted/30 p-4">
                      <h4 className="font-bold">{selectedRoom.room_type}</h4>
                      <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''} · ${selectedRoom.price_per_night.toFixed(2)} / night</p>
                      <p className="mt-2 text-2xl font-bold">${(selectedRoom.price_per_night * nights).toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card">Credit / Debit Card</SelectItem>
                          <SelectItem value="cash">Cash at Hotel</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleBack}>Back</Button>
                      <Button onClick={handleConfirmBooking} disabled={isBooking}>
                        {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Confirm Booking
                      </Button>
                    </div>
                  </div>
                )}

                {bookingStep === 'confirmation' && (
                  <div className="space-y-4 max-w-lg">
                    <div className="flex items-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 p-4">
                      <Check className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className="font-bold text-green-800">Booking Confirmed!</h4>
                        <p className="text-sm text-green-700">Reservation ID: {confirmation?.id || confirmation?.reservation_id || 'N/A'}</p>
                      </div>
                    </div>
                    {confirmation && (
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Guest:</span> {confirmation.guest_name || guestName}</p>
                        <p><span className="text-muted-foreground">Room:</span> {confirmation.room_type || selectedRoom?.room_type} {confirmation.room_number ? `(${confirmation.room_number})` : ''}</p>
                        <p><span className="text-muted-foreground">Check-in:</span> {checkIn?.toLocaleDateString()}</p>
                        <p><span className="text-muted-foreground">Check-out:</span> {checkOut?.toLocaleDateString()}</p>
                        <p><span className="text-muted-foreground">Total:</span> <span className="font-bold">${Number(confirmation.total || selectedRoom?.price_per_night || 0).toFixed(2)}</span></p>
                      </div>
                    )}
                    <Button onClick={handleBack}>New Booking</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : !searched || bookingStep !== 'search' ? null : availability.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <BedDouble className="h-12 w-12 mb-3" />
                <p>No rooms available for the selected dates</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availability.map((room, i) => (
                  <Card key={room.room_type || i} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{room.room_type}</CardTitle>
                        <Badge variant={room.available > 0 ? 'default' : 'outline'}>
                          {room.available} left
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{room.currency} {room.price_per_night.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">per night</p>
                      <Button className="mt-4 w-full" disabled={room.available === 0} onClick={() => handleSelectRoom(room)}>
                        <BedDouble className="mr-2 h-4 w-4" />
                        {room.available > 0 ? 'Book Now' : 'Sold Out'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : reservations.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <BedDouble className="h-12 w-12 mb-3" />
                    <p>No reservations yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Room Type</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.guest_name}</TableCell>
                          <TableCell>{r.room_type} {r.room_number && `(${r.room_number})`}</TableCell>
                          <TableCell>{new Date(r.check_in).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(r.check_out).toLocaleDateString()}</TableCell>
                          <TableCell><Badge>{r.status}</Badge></TableCell>
                          <TableCell className="font-mono font-bold">${Number(r.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {promotions.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Tag className="h-12 w-12 mb-3" />
                    <p>No promotions defined</p>
                    <p className="text-xs mt-1">Create a promotion to start offering discounts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Min Nights</TableHead>
                        <TableHead>Valid Period</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotions.map(promo => (
                        <TableRow key={promo.id}>
                          <TableCell className="font-mono font-bold uppercase">{promo.code}</TableCell>
                          <TableCell>{promo.name}</TableCell>
                          <TableCell className="font-mono">
                            {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value}`}
                          </TableCell>
                          <TableCell>{promo.min_nights}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(promo.valid_from).toLocaleDateString()} - {new Date(promo.valid_to).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {promo.usage_count}/{promo.usage_limit}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={promo.active}
                              onCheckedChange={() => togglePromoActive(promo)}
                            />
                          </TableCell>
                          <TableCell>
                            <AlertDialog open={deleteId === promo.id} onOpenChange={open => !open && setDeleteId(null)}>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => setDeleteId(promo.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{promo.code}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={deletePromotion} className="bg-destructive text-destructive-foreground">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
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
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Promotion</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={newPromo.code} onChange={e => setNewPromo(p => ({...p, code: e.target.value}))} placeholder="e.g., SUMMER20" />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newPromo.name} onChange={e => setNewPromo(p => ({...p, name: e.target.value}))} placeholder="e.g., Summer Sale" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Discount Type</Label>
                  <Select value={newPromo.discount_type} onValueChange={v => setNewPromo(p => ({...p, discount_type: v as 'percentage' | 'fixed'}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Discount Value</Label>
                  <Input type="number" min={1} value={newPromo.discount_value} onChange={e => setNewPromo(p => ({...p, discount_value: parseFloat(e.target.value) || 0}))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Min Nights</Label>
                <Input type="number" min={1} value={newPromo.min_nights} onChange={e => setNewPromo(p => ({...p, min_nights: parseInt(e.target.value) || 1}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Valid From</Label>
                  <Input type="date" value={newPromo.valid_from} onChange={e => setNewPromo(p => ({...p, valid_from: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>Valid To</Label>
                  <Input type="date" value={newPromo.valid_to} onChange={e => setNewPromo(p => ({...p, valid_to: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Usage Limit</Label>
                <Input type="number" min={1} value={newPromo.usage_limit} onChange={e => setNewPromo(p => ({...p, usage_limit: parseInt(e.target.value) || 100}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreatePromotion}>Create Promotion</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
