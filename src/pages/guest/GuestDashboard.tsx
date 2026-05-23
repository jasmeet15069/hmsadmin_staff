import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { AIConciergeChat } from '@/components/ai/AIConciergeChat';
import { VoiceAssistant } from '@/components/ai/VoiceAssistant';
import { MenuSuggestionCard } from '@/components/ai/MenuSuggestionCard';
import { GuestPreferencesDialog } from '@/components/guest/GuestPreferencesDialog';
import { OrderTracker } from '@/components/guest/OrderTracker';
import { GuestRoomStatus } from '@/components/guest/GuestRoomStatus';
import { GuestBillingTab } from '@/components/guest/GuestBillingTab';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  UtensilsCrossed, 
  Clock, 
  CreditCard,
  Star, 
  MessageSquare, 
  LogOut,
  Hotel,
  Plus,
  Sparkles,
  Bed,
  Mic,
  Loader2,
  Wifi,
  Car,
  Waves,
  Coffee,
  ShoppingCart,
} from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  price_per_night: number;
  capacity: number;
  amenities: string[] | null;
  status: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_name?: string;
  is_available: boolean;
  preparation_time: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function GuestDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showConcierge, setShowConcierge] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch available rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'available')
        .order('room_number');

      // Fetch menu items with categories
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('is_available', true)
        .order('name');

      if (roomsData) setRooms(roomsData);
      if (menuData) {
        setMenuItems(menuData.map(item => ({
          ...item,
          category_name: item.menu_categories?.name || 'Other'
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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
      title: "Added to cart",
      description: `${item.name} added to your order`,
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    setIsPlacingOrder(true);
    try {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          guest_id: user?.id,
          total_amount: totalAmount,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setCart([]);
      toast({
        title: "Order placed!",
        description: `Your order #${orderNumber} has been submitted`,
      });
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: "destructive",
        title: "Order failed",
        description: "Failed to place order. Please try again.",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group menu by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    const cat = item.category_name || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      standard: 'Standard Room',
      deluxe: 'Deluxe Room',
      suite: 'Suite',
      penthouse: 'Penthouse',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="border-2 border-primary p-1.5">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold">HotelOps</h1>
              <p className="text-xs text-muted-foreground">Guest Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <Button variant="outline" className="relative gap-2">
                <ShoppingCart className="h-4 w-4" />
                <Badge variant="secondary">{cartCount}</Badge>
                <span className="font-bold">${cartTotal.toFixed(2)}</span>
              </Button>
            )}
            <GuestPreferencesDialog />
            <Button variant="outline" size="icon" onClick={() => setShowVoice(true)} title="Voice Assistant">
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowConcierge(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button variant="outline" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Welcome, {user?.profile?.full_name || 'Guest'}!</h2>
          <p className="text-muted-foreground">Explore our services and make your stay memorable</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setShowVoice(true)}>
            <Mic className="h-6 w-6" />
            <span className="text-sm">Voice Assistant</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setShowConcierge(true)}>
            <MessageSquare className="h-6 w-6" />
            <span className="text-sm">Chat Support</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4">
            <Wifi className="h-6 w-6" />
            <span className="text-sm">WiFi Access</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4">
            <Waves className="h-6 w-6" />
            <span className="text-sm">Spa & Pool</span>
          </Button>
        </div>

        {/* Room Status */}
        <GuestRoomStatus />

        <Tabs defaultValue="menu" className="space-y-6">
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
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
          </TabsList>

          {/* Available Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Available Rooms</h3>
              <Badge variant="outline">{rooms.length} available</Badge>
            </div>
            
            {rooms.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Bed className="mx-auto mb-2 h-8 w-8" />
                  <p>No rooms available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rooms.map(room => (
                  <Card key={room.id} className="border-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Room {room.room_number}</CardTitle>
                          <CardDescription>{getRoomTypeLabel(room.room_type)}</CardDescription>
                        </div>
                        <Badge variant="secondary">${room.price_per_night}/night</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Up to {room.capacity} guests</span>
                      </div>
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {room.amenities.slice(0, 3).map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {room.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{room.amenities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      <Button className="mt-4 w-full" size="sm">
                        Request Booking
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            {/* Cart Summary */}
            {cart.length > 0 && (
              <Card className="border-2 border-primary bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cartCount} item(s) in cart</p>
                      <p className="text-2xl font-bold">${cartTotal.toFixed(2)}</p>
                    </div>
                    <Button onClick={placeOrder} disabled={isPlacingOrder}>
                      {isPlacingOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Placing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Place Order
                        </>
                      )}
                    </Button>
                  </div>
                  {cart.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span>{item.quantity}× {item.name}</span>
                          <div className="flex items-center gap-2">
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => removeFromCart(item.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Suggestions */}
            <MenuSuggestionCard 
              menuItems={menuItems.map(item => ({ 
                id: item.id, 
                name: item.name, 
                price: item.price, 
                description: item.description || '',
                category: item.category_name || 'Other'
              }))}
              onSelectItem={(itemId) => {
                const item = menuItems.find(i => i.id === itemId);
                if (item) addToCart({ id: item.id, name: item.name, price: item.price });
              }}
            />

            {/* Menu Categories */}
            {Object.entries(menuByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-lg font-bold">{category}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map(item => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                          </div>
                          <span className="font-bold">${item.price}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            ~{item.preparation_time} min
                          </span>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <OrderTracker />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <GuestBillingTab />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <h3 className="text-lg font-bold">Hotel Services</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waves className="h-5 w-5" />
                    Spa & Wellness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Relax and rejuvenate with our world-class spa treatments
                  </p>
                  <p className="text-sm"><strong>Hours:</strong> 8:00 AM - 10:00 PM</p>
                  <Button className="mt-4 w-full" variant="outline">Book Appointment</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Restaurant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fine dining with international and local cuisine
                  </p>
                  <p className="text-sm"><strong>Hours:</strong> 6:30 AM - 11:00 PM</p>
                  <Button className="mt-4 w-full" variant="outline">Reserve Table</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Transportation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Airport transfers and city tours available
                  </p>
                  <p className="text-sm"><strong>Concierge:</strong> 24/7 Available</p>
                  <Button className="mt-4 w-full" variant="outline">Book Transport</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="h-5 w-5" />
                    In-Room Dining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    24-hour room service for all your needs
                  </p>
                  <p className="text-sm"><strong>Service:</strong> 24/7 Available</p>
                  <Button className="mt-4 w-full" variant="outline">View Menu</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* AI Assistants */}
      <AIConciergeChat isOpen={showConcierge} onClose={() => setShowConcierge(false)} />
      <VoiceAssistant isOpen={showVoice} onClose={() => setShowVoice(false)} />
    </div>
  );
}
