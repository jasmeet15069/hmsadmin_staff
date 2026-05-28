import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIConciergeChat } from '@/components/ai/AIConciergeChat';
import { MenuSuggestionCard } from '@/components/ai/MenuSuggestionCard';
import { GuestPreferencesDialog } from '@/components/guest/GuestPreferencesDialog';
import { OrderTracker } from '@/components/guest/OrderTracker';
import { 
  Bed, 
  UtensilsCrossed, 
  Clock, 
  Star, 
  MessageSquare, 
  CreditCard,
  LogOut,
  Hotel,
  Plus,
  Sparkles,
  Phone,
  Wifi,
  Coffee,
  Calendar,
  CheckCircle2,
  Users,
  Loader2,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  amenities: string[] | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_name?: string;
  is_available: boolean;
}

const COUNTRY_OPTIONS = [
  { country: 'United States', currency: 'USD', locale: 'en-US' },
  { country: 'India', currency: 'INR', locale: 'en-IN' },
  { country: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { country: 'European Union', currency: 'EUR', locale: 'de-DE' },
  { country: 'United Arab Emirates', currency: 'AED', locale: 'en-AE' },
  { country: 'Canada', currency: 'CAD', locale: 'en-CA' },
  { country: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { country: 'Singapore', currency: 'SGD', locale: 'en-SG' },
];

const dateInputValue = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

export default function GuestServicesPage() {
  const { user, signOut, isStaff } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [showConcierge, setShowConcierge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingCountry, setBookingCountry] = useState(COUNTRY_OPTIONS[0].country);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    guestName: user?.profile?.full_name || '',
    guestEmail: user?.email || '',
    guestPhone: user?.profile?.phone || '',
    checkInDate: dateInputValue(0),
    checkOutDate: dateInputValue(1),
  });

  useEffect(() => {
    if (!isStaff) {
      fetchData();
    }
  }, [isStaff]);

  useEffect(() => {
    const selected = COUNTRY_OPTIONS.find(option => option.country === bookingCountry) || COUNTRY_OPTIONS[0];
    if (selected.currency === 'USD') {
      setExchangeRate(1);
      return;
    }

    setIsRateLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/exchange-rate?base=USD&target=${selected.currency}`)
      .then(response => response.json())
      .then(payload => {
        if (payload.error) throw new Error(payload.error);
        setExchangeRate(Number(payload.data.rate));
      })
      .catch(error => {
        console.error('Error fetching exchange rate:', error);
        setExchangeRate(1);
        toast({
          title: 'Currency rate unavailable',
          description: 'Showing USD pricing until the exchange-rate service responds.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsRateLoading(false));
  }, [bookingCountry, toast]);

  // Staff should go to dashboard
  if (isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    try {
      // Fetch available rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'available')
        .order('room_number');

      setRooms(roomsData || []);

      // Fetch menu items with categories
      const { data: menuData } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories(name)
        `)
        .eq('is_available', true)
        .order('name');

      const formattedMenu = menuData?.map(item => ({
        ...item,
        category_name: (item.menu_categories as any)?.name || 'Uncategorized',
      })) || [];

      setMenuItems(formattedMenu);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} added to your order`,
    });
  };

  const bookingNights = Math.max(
    1,
    Math.ceil((new Date(bookingDetails.checkOutDate).getTime() - new Date(bookingDetails.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  const selectedCountry = COUNTRY_OPTIONS.find(option => option.country === bookingCountry) || COUNTRY_OPTIONS[0];

  const formatMoney = (amount: number, currency = selectedCountry.currency) =>
    new Intl.NumberFormat(selectedCountry.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    }).format(amount);

  const handleStripeBooking = async (room: Room) => {
    if (!user?.id) return;

    if (!bookingDetails.guestName || !bookingDetails.guestEmail || !bookingDetails.checkInDate || !bookingDetails.checkOutDate) {
      toast({
        title: 'Missing booking details',
        description: 'Please enter guest details and stay dates before payment.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          country: selectedCountry.country,
          currency: selectedCountry.currency,
          ...bookingDetails,
          guest_name: bookingDetails.guestName,
          guest_email: bookingDetails.guestEmail,
          guest_phone: bookingDetails.guestPhone,
          check_in_date: bookingDetails.checkInDate,
          check_out_date: bookingDetails.checkOutDate,
          room_id: room.id,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || 'Unable to create Stripe Checkout session');
      window.location.href = payload.data.checkout_url;
    } catch (error) {
      console.error('Error starting Stripe checkout:', error);
      toast({
        title: 'Payment setup failed',
        description: error instanceof Error ? error.message : 'Unable to start Stripe Checkout.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManualBooking = async (room: Room) => {
    if (!user?.id) return;

    try {
      const { error: stayError } = await supabase.from('guest_stays').insert({
        guest_id: user.id,
        room_id: room.id,
        guest_name: bookingDetails.guestName || user.profile?.full_name || user.email,
        guest_email: bookingDetails.guestEmail || user.email,
        guest_phone: bookingDetails.guestPhone,
        check_in_date: bookingDetails.checkInDate,
        check_out_date: bookingDetails.checkOutDate,
        total_amount: room.price_per_night * bookingNights,
        notes: 'Manual guest portal booking',
      });

      if (stayError) throw stayError;

      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', room.id);

      if (roomError) throw roomError;

      toast({
        title: 'Room booked',
        description: `Room ${room.room_number} has been manually booked for tonight.`,
      });
      await fetchData();
    } catch (error) {
      console.error('Error booking room:', error);
      toast({
        title: 'Booking failed',
        description: 'Unable to complete the manual booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getRoomTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      standard: 'Standard',
      deluxe: 'Deluxe',
      suite: 'Suite',
      presidential: 'Presidential Suite',
    };
    return types[type] || type;
  };

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="border-2 border-primary p-1.5">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold">HotelOps Guest Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user?.profile?.full_name || 'Guest'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <Button variant="outline" className="relative">
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Cart ({cart.length})
                <span className="ml-2 font-bold">${cartTotal.toFixed(2)}</span>
              </Button>
            )}
            <GuestPreferencesDialog />
            <Button variant="outline" onClick={() => setShowConcierge(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Concierge
            </Button>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Hotel Services</h2>
          <p className="text-muted-foreground">Browse available rooms, order food, and access hotel services</p>
        </div>

        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 border-2">
            <TabsTrigger value="rooms" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bed className="mr-2 h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Phone className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Available Rooms</h3>
              <Badge variant="secondary">{rooms.length} rooms available</Badge>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-muted-foreground">Loading rooms...</div>
              </div>
            ) : rooms.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No rooms currently available. Please contact reception.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map(room => (
                  <Card key={room.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
                          <CardDescription>{getRoomTypeLabel(room.room_type)} • Floor {room.floor}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-primary/10">
                          ${room.price_per_night}/night
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Up to {room.capacity} guests</span>
                      </div>
                      
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.slice(0, 4).map(amenity => (
                            <Badge key={amenity} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {room.amenities.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{room.amenities.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Calendar className="mr-2 h-4 w-4" />
                            Book Room
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Book Room {room.room_number}</DialogTitle>
                            <DialogDescription>
                              Review the room, enter guest details, choose country/currency, then pay with Stripe.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-3 rounded-none border-2 border-border p-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Room</p>
                                <p className="font-medium">{room.room_number}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="font-medium">Floor {room.floor}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Type</p>
                                <p className="font-medium">{getRoomTypeLabel(room.room_type)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Capacity</p>
                                <p className="font-medium">Up to {room.capacity} guests</p>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Guest Name</Label>
                                <Input
                                  value={bookingDetails.guestName}
                                  onChange={(event) => setBookingDetails({ ...bookingDetails, guestName: event.target.value })}
                                  className="border-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  value={bookingDetails.guestEmail}
                                  onChange={(event) => setBookingDetails({ ...bookingDetails, guestEmail: event.target.value })}
                                  className="border-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input
                                  value={bookingDetails.guestPhone}
                                  onChange={(event) => setBookingDetails({ ...bookingDetails, guestPhone: event.target.value })}
                                  className="border-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Country</Label>
                                <Select value={bookingCountry} onValueChange={setBookingCountry}>
                                  <SelectTrigger className="border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COUNTRY_OPTIONS.map(option => (
                                      <SelectItem key={option.country} value={option.country}>
                                        {option.country} ({option.currency})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Check In</Label>
                                <Input
                                  type="date"
                                  value={bookingDetails.checkInDate}
                                  onChange={(event) => setBookingDetails({ ...bookingDetails, checkInDate: event.target.value })}
                                  className="border-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Check Out</Label>
                                <Input
                                  type="date"
                                  value={bookingDetails.checkOutDate}
                                  onChange={(event) => setBookingDetails({ ...bookingDetails, checkOutDate: event.target.value })}
                                  className="border-2"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 border-2 border-border p-3">
                              <div className="flex justify-between text-sm">
                                <span>Base rate</span>
                                <span>{formatMoney(room.price_per_night, 'USD')} / night</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Nights</span>
                                <span>{bookingNights}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Live rate</span>
                                <span>{isRateLoading ? 'Loading...' : `1 USD = ${exchangeRate.toFixed(4)} ${selectedCountry.currency}`}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                <span>Total</span>
                                <span>{formatMoney(room.price_per_night * bookingNights * exchangeRate)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Currency conversion is fetched live from the internet. Stripe will collect payment in {selectedCountry.currency}.
                              </p>
                            </div>

                            <Button className="w-full" onClick={() => handleStripeBooking(room)} disabled={isCheckingOut || isRateLoading}>
                              {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                              Pay & Book with Stripe
                            </Button>
                            <Button className="w-full" variant="outline" onClick={() => handleManualBooking(room)} disabled={isCheckingOut}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Hold Room Without Payment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <MenuSuggestionCard 
              menuItems={menuItems.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: item.category_name || 'Other',
              }))}
              onSelectItem={(itemId) => {
                const item = menuItems.find(i => i.id === itemId);
                if (item) addToCart({ id: item.id, name: item.name, price: item.price });
              }}
            />

            {Object.entries(menuByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-lg font-bold">{category}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <CardDescription className="text-sm">{item.description}</CardDescription>
                          </div>
                          <span className="font-bold">${item.price}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add to Order
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {menuItems.length === 0 && !loading && (
              <Card className="border-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Menu items are currently being updated. Please check back later.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <OrderTracker />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <h3 className="text-lg font-bold">Hotel Services</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2 cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Room Service
                  </CardTitle>
                  <CardDescription>24/7 in-room dining and requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Call extension 0 for immediate assistance or use the menu tab to order food.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Room Service
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="h-5 w-5" />
                    Housekeeping
                  </CardTitle>
                  <CardDescription>Room cleaning and amenity requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Request extra towels, pillows, toiletries, or cleaning service.
                  </p>
                  <Button variant="outline" className="w-full">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Request Housekeeping
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    WiFi & Tech Support
                  </CardTitle>
                  <CardDescription>Internet access and technical assistance</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Network: HotelOps_Guest<br />
                    Password: Available at reception
                  </p>
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Tech Support
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Complaints & Feedback
                  </CardTitle>
                  <CardDescription>We value your feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Report issues or share suggestions to help us improve your stay.
                  </p>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <h3 className="text-lg font-bold">Billing Summary</h3>
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Current Stay</CardTitle>
                <CardDescription>Your billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active booking found.</p>
                  <p className="text-sm">Book a room to see your billing details here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* AI Concierge Chat */}
      <AIConciergeChat isOpen={showConcierge} onClose={() => setShowConcierge(false)} />
    </div>
  );
}
