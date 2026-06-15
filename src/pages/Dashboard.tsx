import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClickableStatCard } from '@/components/dashboard/ClickableStatCard';
import { LiveOrderCard } from '@/components/dashboard/LiveOrderCard';
import { RoomStatusGrid } from '@/components/dashboard/RoomStatusGrid';
import { useRooms } from '@/hooks/useRooms';
import { useOrders } from '@/hooks/useOrders';
import { useGuestStays } from '@/hooks/useGuestStays';
import GuestDashboard from '@/pages/guest/GuestDashboard';
import {
  Bed, UtensilsCrossed, Clock, Users, ChefHat, Truck, Loader2, RefreshCw,
  AlertTriangle, Settings, DollarSign, Building2, TrendingUp, Calendar,
  ArrowRight, UserPlus, FileText, ClipboardCheck
} from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { defaultPortalPath } from '@/lib/rolePortal';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function Dashboard() {
  const { user, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { rooms, stats: roomStats, isLoading: roomsLoading, refetch: refetchRooms } = useRooms();
  const { orders, stats: orderStats, isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { todayCheckIns, currentGuests, refetch: refetchStays } = useGuestStays();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashData, setDashData] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const isHotelAdmin = hasAnyRole(['platform_admin', 'hotel_admin', 'super_admin']);
  const isAdmin = hasAnyRole(['property_manager', 'receptionist', 'admin']) || isHotelAdmin;
  const isFoodManager = hasRole('food_manager');
  const isKitchenManager = hasRole('kitchen_manager');
  const isWaiter = hasRole('waiter');
  const isGuest = hasRole('guest') && !hasAnyRole(['platform_admin', 'hotel_admin', 'property_manager', 'receptionist', 'housekeeping', 'maintenance', 'super_admin', 'admin', 'food_manager', 'kitchen_manager', 'waiter']);

  useEffect(() => {
    if (!isGuest) fetchDashData();
  }, []);

  async function fetchDashData() {
    setDashLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/data`);
      const json = await res.json();
      setDashData(json.data || {});
    } catch { /* ignore */ }
    setDashLoading(false);
  }

  const isLoading = roomsLoading || ordersLoading || dashLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchRooms(), refetchOrders(), refetchStays(), fetchDashData()]);
    setIsRefreshing(false);
  };

  if (isGuest) return <GuestDashboard />;
  if (!isAdmin && !isFoodManager && !isKitchenManager && !isWaiter)
    return <Navigate to={defaultPortalPath(user?.roles || [])} replace />;

  const activeOrders = orders
    .filter(o => !['delivered', 'cancelled'].includes(o.status))
    .slice(0, 5)
    .map(o => ({
      orderNumber: o.order_number,
      roomNumber: o.rooms?.room_number || 'N/A',
      guestName: o.guest_stays?.guest_name || 'Walk-in',
      items: o.order_items?.map(i => ({ name: i.menu_items?.name || 'Item', quantity: i.quantity })) || [],
      status: o.status as 'pending' | 'preparing' | 'ready',
      createdAt: o.created_at,
      specialInstructions: o.special_instructions || undefined,
    }));

  const roomsForGrid = rooms.map(r => ({
    id: r.id,
    room_number: r.room_number,
    status: r.status as 'available' | 'occupied' | 'maintenance' | 'cleaning',
    floor: r.floor,
  }));

  const stats = dashData?.stats;
  const charts = dashData?.charts;

  const revenueToday = stats?.revenue_today || 0;
  const occupancyRate = stats?.occupancy_rate || 0;
  const adr = stats?.rooms_occupied > 0 ? revenueToday / stats.rooms_occupied : 0;
  const revpar = stats?.rooms_occupied + stats?.rooms_available > 0
    ? revenueToday / (stats.rooms_occupied + stats.rooms_available) : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              {isHotelAdmin && 'Hotel owner operations overview'}
              {!isHotelAdmin && isAdmin && 'Front desk operations overview'}
              {isFoodManager && 'Food & beverage operations'}
              {isKitchenManager && 'Kitchen operations status'}
              {isWaiter && 'Your delivery assignments'}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh dashboard">
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Setup alert */}
        {isHotelAdmin && roomStats.total === 0 && (
          <div className="border-2 border-amber-600 bg-amber-50 p-4 text-amber-950">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5" />
                <div>
                  <h3 className="font-bold">Complete your hotel setup</h3>
                  <p className="text-sm">Add rooms and configure payment settings</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Open Settings</Link>
              </Button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {isAdmin && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <ClickableStatCard title="Total Revenue" value={formatCurrency(revenueToday)} subtitle="Today's revenue" icon={<DollarSign className="h-5 w-5" />} variant="highlight" href="/payments" />
            <ClickableStatCard title="Occupancy" value={`${Math.round(occupancyRate * 100)}%`} subtitle={`${stats?.rooms_occupied || 0} of ${(stats?.rooms_occupied || 0) + (stats?.rooms_available || 0)} rooms`} icon={<Building2 className="h-5 w-5" />} href="/rooms" />
            <ClickableStatCard title="ADR" value={formatCurrency(adr)} subtitle="Avg daily rate" icon={<TrendingUp className="h-5 w-5" />} href="/payments" />
            <ClickableStatCard title="RevPAR" value={formatCurrency(revpar)} subtitle="Revenue per avail. room" icon={<Calendar className="h-5 w-5" />} href="/reports" />
          </div>
        )}

        {/* Kitchen KPI cards */}
        {(isKitchenManager || isFoodManager) && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <ClickableStatCard title="Active Orders" value={orderStats.pending + orderStats.preparing + orderStats.ready} subtitle={`${orderStats.ready} ready for pickup`} icon={<UtensilsCrossed className="h-5 w-5" />} href="/kitchen" />
            <ClickableStatCard title="Avg. Prep Time" value="18m" subtitle="2m faster than target" icon={<Clock className="h-5 w-5" />} trend={{ value: 8, isPositive: true }} href="/kitchen" />
            <ClickableStatCard title="Orders in Queue" value={orderStats.pending + orderStats.preparing} icon={<ChefHat className="h-5 w-5" />} href="/kitchen" />
          </div>
        )}
        {isWaiter && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <ClickableStatCard title="My Deliveries Today" value={orderStats.ready} icon={<Truck className="h-5 w-5" />} href="/kitchen" />
          </div>
        )}

        {isAdmin && (
          <>
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/guests')}><UserPlus className="h-4 w-4 mr-1" /> New Reservation</Button>
              <Button onClick={() => navigate('/guests')} variant="secondary"><ClipboardCheck className="h-4 w-4 mr-1" /> Check-in</Button>
              <Button onClick={() => navigate('/housekeeping')} variant="outline"><Bed className="h-4 w-4 mr-1" /> Housekeeping</Button>
              <Button onClick={() => navigate('/reports')} variant="outline"><FileText className="h-4 w-4 mr-1" /> Reports</Button>
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue Trend */}
              <Card>
                <CardHeader><CardTitle className="text-base">Revenue Trend (7 days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={charts?.revenue_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="room" name="Room Revenue" stackId="1" stroke="#0066CC" fill="#0066CC" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="fnb" name="F&B Revenue" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="other" name="Other" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Occupancy Trend */}
              <Card>
                <CardHeader><CardTitle className="text-base">Occupancy Trend (7 days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={charts?.occupancy_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                      <Tooltip formatter={(v: number, name: string) => name === 'rate' ? `${v.toFixed(1)}%` : v} />
                      <Legend />
                      <Bar dataKey="rate" name="Occupancy %" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Department Revenue */}
              <Card>
                <CardHeader><CardTitle className="text-base">Department Revenue</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={charts?.department_revenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="current" name="This Month" fill="#0066CC" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="previous" name="Last Month" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Today's Operations */}
              <Card>
                <CardHeader><CardTitle className="text-base">Today's Operations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Check-ins</span>
                        <Badge>{stats?.guests_checking_in_today || 0}</Badge>
                      </div>
                      <div className="space-y-1">
                        {(charts?.arrivals_today || []).slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs"><span>{a.guest_name}</span><span className="text-muted-foreground">Rm {a.room}</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Check-outs</span>
                        <Badge variant="secondary">{stats?.guests_checking_out_today || 0}</Badge>
                      </div>
                      <div className="space-y-1">
                        {(charts?.departures_today || []).slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs"><span>{a.guest_name}</span><span className="text-muted-foreground">Rm {a.room}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pending Payments</span>
                      <Badge variant="outline">{(charts?.pending_payments || []).length}</Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(charts?.pending_payments || []).slice(0, 4).map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{p.guest_name}</span>
                          <span className="font-mono">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
              <CardContent>
                {(charts?.recent_activity || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {(charts?.recent_activity || []).slice(0, 8).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-1 last:border-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{a.user}</span>
                          <span className="text-muted-foreground">{a.action}</span>
                          {a.details && <span className="text-xs text-muted-foreground">— {a.details}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{a.created_at?.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Orders & Room Status */}
            <div className="grid gap-6 lg:grid-cols-2">
              {activeOrders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Live Orders</h3>
                    <Badge className="bg-red-500">LIVE</Badge>
                  </div>
                  <div className="space-y-3">
                    {activeOrders.map(order => (<LiveOrderCard key={order.orderNumber} {...order} />))}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Room Status</h3>
                <Card><CardContent className="p-4"><RoomStatusGrid rooms={roomsForGrid} /></CardContent></Card>
              </div>
            </div>
          </>
        )}

        {/* Non-admin live orders */}
        {!isAdmin && activeOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Live Orders</h3>
              <Badge className="bg-red-500">LIVE</Badge>
            </div>
            <div className="space-y-3">{activeOrders.map(order => (<LiveOrderCard key={order.orderNumber} {...order} />))}</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
