import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/types/auth';
import { User, Bell, Lock, Palette, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: user?.profile?.full_name || '',
    phone: user?.profile?.phone || '',
  });
  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    complaintAlerts: true,
    stockAlerts: true,
    soundEnabled: true,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully' });
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsLoading(false);
  };

  const primaryRole = user?.roles.find(r => r !== 'guest') || user?.roles[0] || 'guest';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Settings */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_LABELS[primaryRole]}
                  </p>
                </div>
              </div>
              
              <Separator />

              <div>
                <Label>Full Name</Label>
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="mt-1 border-2"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="mt-1 border-2"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 border-2"
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 border-2"
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 border-2"
                />
              </div>
              <Button onClick={handleUpdatePassword} disabled={isLoading || !newPassword}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified for new orders</p>
                </div>
                <Switch
                  checked={notifications.orderAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, orderAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Complaint Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified for new complaints</p>
                </div>
                <Switch
                  checked={notifications.complaintAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, complaintAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified for low stock items</p>
                </div>
                <Switch
                  checked={notifications.stockAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, stockAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound Enabled</p>
                  <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                </div>
                <Switch
                  checked={notifications.soundEnabled}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, soundEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>Account actions and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-destructive/20 bg-destructive/5 p-4">
                <h4 className="font-bold text-destructive">Danger Zone</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign out from your account
                </p>
                <Button
                  variant="destructive"
                  className="mt-4"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
