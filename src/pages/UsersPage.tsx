import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, Shield, ShieldOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const ROLE_LABELS_MAP: Record<string, string> = {
  platform_admin: "Platform Admin",
  hotel_admin: "Hotel Admin",
  property_manager: "Property Manager",
  receptionist: "Receptionist",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  super_admin: "Super Admin",
  admin: "Admin (Legacy)",
  food_manager: "Food Manager",
  kitchen_manager: "Kitchen Manager",
  waiter: "Waiter",
  guest: "Guest",
};

const ALL_ROLES = Object.keys(ROLE_LABELS_MAP);

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  joined_at: string;
}

export default function UsersPage() {
  const { user, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (!hasAnyRole(["platform_admin", "hotel_admin", "super_admin"])) {
      navigate("/dashboard");
      return;
    }
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRole() {
    if (!editingUser || !selectedRole) return;
    setSavingRole(true);
    try {
      const res = await fetch(`${API_BASE}/users/${editingUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, roles: data.data || [] } : u));
        setEditingUser({ ...editingUser, roles: data.data || [] });
        toast({ title: "Role added" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to add role", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add role", variant: "destructive" });
    } finally {
      setSavingRole(false);
    }
  }

  async function handleRemoveRole(role: string) {
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_BASE}/users/${editingUser.id}/roles/${role}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, roles: data.data || [] } : u));
        setEditingUser({ ...editingUser, roles: data.data || [] });
        toast({ title: `Role ${role} removed` });
      } else {
        toast({ title: "Error", description: data.error || "Failed to remove role", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!hasAnyRole(["platform_admin", "hotel_admin", "super_admin"])) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map(r => (
                          <Badge key={r} variant="secondary">{ROLE_LABELS_MAP[r] || r}</Badge>
                        ))}
                        {(!u.roles || u.roles.length === 0) && (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.joined_at}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}>
                        <Shield className="h-4 w-4 mr-1" /> Roles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={o => { if (!o) setEditingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Roles — {editingUser?.full_name || editingUser?.email}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Roles</label>
                <div className="flex flex-wrap gap-2">
                  {editingUser.roles?.map(r => (
                    <Badge key={r} variant="secondary" className="gap-1 pr-1">
                      {ROLE_LABELS_MAP[r] || r}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => handleRemoveRole(r)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {(!editingUser.roles || editingUser.roles.length === 0) && (
                    <span className="text-muted-foreground text-sm">No roles assigned</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Role</label>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter(r => !editingUser.roles?.includes(r)).map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS_MAP[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddRole} disabled={!selectedRole || savingRole}>
                    {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
