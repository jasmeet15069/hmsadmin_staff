import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Bed, 
  Users, 
  UtensilsCrossed,
  Calendar,
  Star,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalRooms: number;
  occupiedRooms: number;
  totalOrders: number;
  totalRevenue: number;
  totalGuests: number;
  avgOrderValue: number;
  pendingComplaints: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

// Mock data for charts (would be fetched from DB in production)
const revenueData = [
  { name: 'Mon', revenue: 2400, orders: 24 },
  { name: 'Tue', revenue: 1398, orders: 13 },
  { name: 'Wed', revenue: 9800, orders: 98 },
  { name: 'Thu', revenue: 3908, orders: 39 },
  { name: 'Fri', revenue: 4800, orders: 48 },
  { name: 'Sat', revenue: 3800, orders: 38 },
  { name: 'Sun', revenue: 4300, orders: 43 },
];

const occupancyData = [
  { name: 'Week 1', rate: 65 },
  { name: 'Week 2', rate: 72 },
  { name: 'Week 3', rate: 80 },
  { name: 'Week 4', rate: 75 },
];

const orderCategoryData = [
  { name: 'Breakfast', value: 35 },
  { name: 'Lunch', value: 25 },
  { name: 'Dinner', value: 30 },
  { name: 'Beverages', value: 10 },
];

export default function AnalyticsPage() {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    occupiedRooms: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalGuests: 0,
    avgOrderValue: 0,
    pendingComplaints: 0,
  });
  const [loading, setLoading] = useState(true);

  const isAuthorized = hasRole('admin') || hasRole('super_admin');

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchStats = async () => {
    try {
      // Fetch rooms
      const { data: rooms } = await supabase.from('rooms').select('status');
      const totalRooms = rooms?.length || 0;
      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;

      // Fetch orders
      const { data: orders } = await supabase.from('orders').select('total_amount, status');
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Fetch profiles (guests)
      const { data: profiles } = await supabase.from('profiles').select('id');
      const totalGuests = profiles?.length || 0;

      // Fetch complaints
      const { data: complaints } = await supabase.from('complaints').select('status');
      const pendingComplaints = complaints?.filter(c => c.status === 'open' || c.status === 'in_progress').length || 0;

      setStats({
        totalRooms,
        occupiedRooms,
        totalOrders,
        totalRevenue,
        totalGuests,
        avgOrderValue,
        pendingComplaints,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const occupancyRate = stats.totalRooms > 0 
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive hotel performance metrics and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1 text-primary" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.occupiedRooms} of {stats.totalRooms} rooms occupied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Avg. ${stats.avgOrderValue.toFixed(2)} per order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingComplaints} pending complaints
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Revenue & Orders
                </CardTitle>
                <CardDescription>Revenue and order count over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '2px solid hsl(var(--border))',
                          borderRadius: '0'
                        }} 
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Occupancy Rate
                </CardTitle>
                <CardDescription>Room occupancy trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '2px solid hsl(var(--border))',
                          borderRadius: '0'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Occupancy %" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Orders by Category
                  </CardTitle>
                  <CardDescription>Distribution of food orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {orderCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Performance Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm">Most Popular Item</span>
                    <span className="font-medium">Grilled Salmon</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm">Peak Order Time</span>
                    <span className="font-medium">7:00 PM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm">Avg. Delivery Time</span>
                    <span className="font-medium">18 minutes</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm">Customer Satisfaction</span>
                    <span className="font-medium">4.8 / 5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Repeat Guest Rate</span>
                    <span className="font-medium">34%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
