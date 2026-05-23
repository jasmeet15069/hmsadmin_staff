import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, ROLE_LABELS } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Activity, FileText, Settings, UserPlus, Trash2, Bed, UtensilsCrossed, Plus, Edit, BarChart3 } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

interface StaffMember {
  user_id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  status: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
}

export default function AdminPanel() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>('waiter');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Room form state
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'standard',
    floor: 1,
    capacity: 2,
    price_per_night: 100,
  });
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  // Menu form state
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 0,
    is_available: true,
  });
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);

  const isAuthorized = hasRole('admin') || hasRole('super_admin');

  useEffect(() => {
    if (isAuthorized) {
      fetchAllData();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchAllData = async () => {
    await Promise.all([fetchStaffMembers(), fetchRooms(), fetchMenuItems()]);
    setLoading(false);
  };

  const fetchStaffMembers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const staffMap = new Map<string, StaffMember>();
      
      profiles?.forEach(profile => {
        staffMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: '',
          full_name: profile.full_name,
          roles: []
        });
      });

      roles?.forEach(role => {
        const staff = staffMap.get(role.user_id);
        if (staff) {
          staff.roles.push(role.role as AppRole);
        }
      });

      setStaffMembers(Array.from(staffMap.values()));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data } = await supabase.from('rooms').select('*').order('room_number');
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await supabase.from('menu_items').select('*').order('name');
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const addRoleToUser = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already assigned', description: 'User already has this role', variant: 'destructive' });
          return;
        }
        throw error;
      }

      toast({ title: 'Role added', description: `Successfully added ${ROLE_LABELS[role]} role` });
      fetchStaffMembers();
    } catch (error) {
      console.error('Error adding role:', error);
      toast({ title: 'Error', description: 'Failed to add role', variant: 'destructive' });
    }
  };

  const removeRoleFromUser = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({ title: 'Role removed', description: `Successfully removed ${ROLE_LABELS[role]} role` });
      fetchStaffMembers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: 'Failed to remove role', variant: 'destructive' });
    }
  };

  // Room CRUD
  const saveRoom = async () => {
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update(roomForm)
          .eq('id', editingRoom.id);
        if (error) throw error;
        toast({ title: 'Room updated', description: `Room ${roomForm.room_number} updated successfully` });
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({ ...roomForm, status: 'available' });
        if (error) throw error;
        toast({ title: 'Room created', description: `Room ${roomForm.room_number} created successfully` });
      }
      setRoomDialogOpen(false);
      setEditingRoom(null);
      setRoomForm({ room_number: '', room_type: 'standard', floor: 1, capacity: 2, price_per_night: 100 });
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({ title: 'Error', description: 'Failed to save room', variant: 'destructive' });
    }
  };

  const deleteRoom = async (id: string) => {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Room deleted' });
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    }
  };

  // Menu CRUD
  const saveMenuItem = async () => {
    try {
      if (editingMenuItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(menuForm)
          .eq('id', editingMenuItem.id);
        if (error) throw error;
        toast({ title: 'Menu item updated', description: `${menuForm.name} updated successfully` });
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(menuForm);
        if (error) throw error;
        toast({ title: 'Menu item created', description: `${menuForm.name} created successfully` });
      }
      setMenuDialogOpen(false);
      setEditingMenuItem(null);
      setMenuForm({ name: '', description: '', price: 0, is_available: true });
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({ title: 'Error', description: 'Failed to save menu item', variant: 'destructive' });
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Menu item deleted' });
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({ title: 'Error', description: 'Failed to delete menu item', variant: 'destructive' });
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'super_admin': return 'default';
      case 'food_manager': return 'secondary';
      case 'kitchen_manager': return 'outline';
      case 'waiter': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Complete control over users, rooms, menu, and system settings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {staffMembers.filter(s => s.roles.some(r => r !== 'guest')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menuItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffMembers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/audit-logs">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>View system activity and changes</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/analytics">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>Revenue and performance metrics</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system preferences</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="rooms">
              <Bed className="mr-2 h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="menu">
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Menu
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user roles. Users must sign up first before roles can be assigned.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Current Roles</TableHead>
                        <TableHead>Add Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMembers.map((staff) => (
                        <TableRow key={staff.user_id}>
                          <TableCell className="font-medium">{staff.full_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {staff.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant={getRoleBadgeVariant(role)}
                                  className="cursor-pointer group"
                                  onClick={() => {
                                    if (role !== 'guest' && staff.user_id !== user?.id) {
                                      removeRoleFromUser(staff.user_id, role);
                                    }
                                  }}
                                >
                                  {ROLE_LABELS[role]}
                                  {role !== 'guest' && staff.user_id !== user?.id && (
                                    <Trash2 className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" />
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={selectedUserId === staff.user_id ? selectedRole : ''}
                                onValueChange={(value) => {
                                  setSelectedUserId(staff.user_id);
                                  setSelectedRole(value as AppRole);
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="super_admin">Super Admin</SelectItem>
                                  <SelectItem value="food_manager">Food Manager</SelectItem>
                                  <SelectItem value="kitchen_manager">Kitchen Manager</SelectItem>
                                  <SelectItem value="waiter">Waiter</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                disabled={selectedUserId !== staff.user_id || !selectedRole}
                                onClick={() => {
                                  if (selectedUserId === staff.user_id && selectedRole) {
                                    addRoleToUser(staff.user_id, selectedRole);
                                    setSelectedUserId(null);
                                  }
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    Room Management
                  </CardTitle>
                  <CardDescription>Create, edit, and manage hotel rooms</CardDescription>
                </div>
                <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingRoom(null);
                      setRoomForm({ room_number: '', room_type: 'standard', floor: 1, capacity: 2, price_per_night: 100 });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                      <DialogDescription>
                        {editingRoom ? 'Update room details' : 'Create a new hotel room'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Room Number</Label>
                        <Input 
                          value={roomForm.room_number} 
                          onChange={(e) => setRoomForm({...roomForm, room_number: e.target.value})}
                          placeholder="e.g., 101"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <Select value={roomForm.room_type} onValueChange={(v) => setRoomForm({...roomForm, room_type: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="deluxe">Deluxe</SelectItem>
                            <SelectItem value="suite">Suite</SelectItem>
                            <SelectItem value="presidential">Presidential</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Floor</Label>
                          <Input 
                            type="number" 
                            value={roomForm.floor} 
                            onChange={(e) => setRoomForm({...roomForm, floor: parseInt(e.target.value) || 1})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Capacity</Label>
                          <Input 
                            type="number" 
                            value={roomForm.capacity} 
                            onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value) || 2})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Price per Night ($)</Label>
                        <Input 
                          type="number" 
                          value={roomForm.price_per_night} 
                          onChange={(e) => setRoomForm({...roomForm, price_per_night: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
                      <Button onClick={saveRoom}>{editingRoom ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Price/Night</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_number}</TableCell>
                        <TableCell className="capitalize">{room.room_type}</TableCell>
                        <TableCell>{room.floor}</TableCell>
                        <TableCell>{room.capacity}</TableCell>
                        <TableCell>${room.price_per_night}</TableCell>
                        <TableCell>
                          <Badge variant={room.status === 'available' ? 'default' : 'secondary'}>
                            {room.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingRoom(room);
                                setRoomForm({
                                  room_number: room.room_number,
                                  room_type: room.room_type,
                                  floor: room.floor,
                                  capacity: room.capacity,
                                  price_per_night: room.price_per_night,
                                });
                                setRoomDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteRoom(room.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Menu Management
                  </CardTitle>
                  <CardDescription>Create, edit, and manage menu items</CardDescription>
                </div>
                <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingMenuItem(null);
                      setMenuForm({ name: '', description: '', price: 0, is_available: true });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                      <DialogDescription>
                        {editingMenuItem ? 'Update menu item details' : 'Create a new menu item'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                          value={menuForm.name} 
                          onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                          placeholder="e.g., Grilled Salmon"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input 
                          value={menuForm.description} 
                          onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                          placeholder="Brief description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input 
                          type="number" 
                          value={menuForm.price} 
                          onChange={(e) => setMenuForm({...menuForm, price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="available"
                          checked={menuForm.is_available}
                          onChange={(e) => setMenuForm({...menuForm, is_available: e.target.checked})}
                        />
                        <Label htmlFor="available">Available</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMenuDialogOpen(false)}>Cancel</Button>
                      <Button onClick={saveMenuItem}>{editingMenuItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.description || '-'}</TableCell>
                        <TableCell>${item.price}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_available ? 'default' : 'secondary'}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingMenuItem(item);
                                setMenuForm({
                                  name: item.name,
                                  description: item.description || '',
                                  price: item.price,
                                  is_available: item.is_available,
                                });
                                setMenuDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteMenuItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
