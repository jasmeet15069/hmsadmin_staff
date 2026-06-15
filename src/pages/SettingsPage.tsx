import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole, ROLE_LABELS } from '@/types/auth';
import { COUNTRY_OPTIONS, getCountryOption } from '@/lib/currency';
import { applyAdminBrandTheme } from '@/hooks/useHotelBranding';
import { useRolePortalSettings, RolePortalSetting, RolePortalSettingsMap } from '@/hooks/useRolePortalSettings';
import { moduleIDByPath, navItemByID, ROLE_PORTAL_ROLES, rolePortalPreset } from '@/lib/staffNavigation';
import { cn } from '@/lib/utils';
import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CreditCard,
  Database,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Palette,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Server,
  User,
  Zap,
} from 'lucide-react';

type Gateway = 'none' | 'stripe' | 'razorpay' | 'cash' | 'card' | 'bank_transfer';
type GatewayMode = 'test' | 'live';

interface PaymentSettings {
  active_gateway: Gateway;
  default_currency: string;
  country?: string | null;
  gateway_mode: GatewayMode;
  stripe_enabled: boolean;
  stripe_account_id?: string | null;
  stripe_publishable_key?: string | null;
  stripe_secret_configured: boolean;
  stripe_webhook_configured: boolean;
  razorpay_enabled: boolean;
  razorpay_key_id?: string | null;
  razorpay_secret_configured: boolean;
  cash_enabled: boolean;
  card_enabled: boolean;
  bank_transfer_enabled: boolean;
  deposit_type: 'percentage' | 'fixed';
  deposit_value: number;
  cancellation_free_hours: number;
  cancellation_penalty_percent: number;
}

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const defaultPaymentSettings: PaymentSettings = {
  active_gateway: 'none',
  default_currency: 'USD',
  country: 'United States',
  gateway_mode: 'test',
  stripe_enabled: false,
  stripe_secret_configured: false,
  stripe_webhook_configured: false,
  razorpay_enabled: false,
  razorpay_secret_configured: false,
  cash_enabled: true,
  card_enabled: true,
  bank_transfer_enabled: false,
  deposit_type: 'percentage',
  deposit_value: 0,
  cancellation_free_hours: 24,
  cancellation_penalty_percent: 0,
};

async function apiJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  let authHeader = {};
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    if (session?.access_token) authHeader = { Authorization: `Bearer ${session.access_token}` };
  } catch {
    authHeader = {};
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || response.statusText || 'Request failed');
  }
  return payload.data as T;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPortal, setIsSavingPortal] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
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
  const [branding, setBranding] = useState({
    hotel_id: '',
    hotel_name: 'HotelOps',
    logo_url: '',
    primary_color: '#000000',
    admin_primary_color: '#000000',
    client_primary_color: '#000000',
    welcome_message: '',
    footer_text: '',
  });
  const [payment, setPayment] = useState<PaymentSettings>(defaultPaymentSettings);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [razorpaySecret, setRazorpaySecret] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('super_admin');
  const [roleDrafts, setRoleDrafts] = useState<RolePortalSettingsMap>({});
  const [isSavingRolePortal, setIsSavingRolePortal] = useState(false);
  const {
    settings: rolePortalSettings,
    isLoading: isLoadingRolePortals,
    saveRoleSettings,
  } = useRolePortalSettings();

  const primaryRole = user?.roles.find(r => r !== 'guest') || user?.roles[0] || 'guest';
  const selectedCountry = useMemo(
    () => getCountryOption(payment.country, payment.default_currency),
    [payment.country, payment.default_currency],
  );

  useEffect(() => {
    setRoleDrafts(rolePortalSettings);
  }, [rolePortalSettings]);

  const selectedRoleSetting = useMemo<RolePortalSetting>(() => {
    const preset = rolePortalPreset(selectedRole);
    return {
      role: selectedRole,
      label: preset.title,
      description: preset.description,
      default_path: preset.defaultPath,
      visible_modules: [...preset.modules],
      ...roleDrafts[selectedRole],
    };
  }, [roleDrafts, selectedRole]);

  const availableRoleNav = useMemo(
    () => rolePortalPreset(selectedRole).modules
      .map(navItemByID)
      .filter((item): item is NonNullable<ReturnType<typeof navItemByID>> => Boolean(item)),
    [selectedRole],
  );

  const selectedVisibleModules = useMemo(() => new Set(selectedRoleSetting.visible_modules), [selectedRoleSetting.visible_modules]);

  const updateSelectedRoleDraft = (changes: Partial<RolePortalSetting>) => {
    setRoleDrafts(prev => ({
      ...prev,
      [selectedRole]: {
        ...selectedRoleSetting,
        ...changes,
      },
    }));
  };

  const toggleRoleModule = (moduleID: string, checked: boolean) => {
    let nextModules = checked
      ? Array.from(new Set([...selectedRoleSetting.visible_modules, moduleID]))
      : selectedRoleSetting.visible_modules.filter(id => id !== moduleID);
    if (nextModules.length === 0) {
      nextModules = [rolePortalPreset(selectedRole).modules[0]].filter(Boolean);
    }
    const defaultModuleID = moduleIDByPath(selectedRoleSetting.default_path);
    const defaultStillVisible = defaultModuleID && nextModules.includes(defaultModuleID);
    const nextDefaultPath = defaultStillVisible
      ? selectedRoleSetting.default_path
      : navItemByID(nextModules[0])?.href || rolePortalPreset(selectedRole).defaultPath;
    updateSelectedRoleDraft({ visible_modules: nextModules, default_path: nextDefaultPath });
  };

  const resetSelectedRoleDraft = () => {
    const preset = rolePortalPreset(selectedRole);
    updateSelectedRoleDraft({
      default_path: preset.defaultPath,
      visible_modules: [...preset.modules],
    });
  };

  const handleSaveRolePortal = async () => {
    setIsSavingRolePortal(true);
    try {
      const saved = await saveRoleSettings({
        role: selectedRole,
        default_path: selectedRoleSetting.default_path,
        visible_modules: selectedRoleSetting.visible_modules,
      });
      setRoleDrafts(prev => ({ ...prev, [selectedRole]: saved }));
      toast({ title: 'Role portal saved', description: `${saved.label || ROLE_LABELS[selectedRole]} navigation was updated.` });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save role portal settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingRolePortal(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      setIsLoading(true);
      try {
        const [brandingData, paymentData] = await Promise.all([
          apiJSON<Record<string, unknown>>('/hotel/branding'),
          apiJSON<PaymentSettings>('/settings/payment'),
        ]);
        if (cancelled) return;
        setBranding({
          hotel_id: String(brandingData.hotel_id || ''),
          hotel_name: String(brandingData.hotel_name || 'HotelOps'),
          logo_url: String(brandingData.logo_url || ''),
          primary_color: String(brandingData.primary_color || '#000000'),
          admin_primary_color: String(brandingData.admin_primary_color || brandingData.primary_color || '#000000'),
          client_primary_color: String(brandingData.client_primary_color || brandingData.primary_color || '#000000'),
          welcome_message: String(brandingData.welcome_message || ''),
          footer_text: String(brandingData.footer_text || ''),
        });
        setPayment({
          ...defaultPaymentSettings,
          ...paymentData,
          active_gateway: (paymentData.active_gateway || 'none') as Gateway,
          gateway_mode: (paymentData.gateway_mode || 'test') as GatewayMode,
          country: paymentData.country || String(brandingData.country || defaultPaymentSettings.country),
          default_currency: paymentData.default_currency || String(brandingData.currency || defaultPaymentSettings.default_currency),
        });
      } catch (error) {
        toast({
          title: 'Settings unavailable',
          description: error instanceof Error ? error.message : 'Unable to load hotel settings.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const patchPayment = (changes: Partial<PaymentSettings>) => {
    setPayment(prev => ({ ...prev, ...changes }));
  };

  const handleCountryChange = (country: string) => {
    const option = getCountryOption(country);
    patchPayment({ country: option.country, default_currency: option.currency });
  };

  const buildPaymentPayload = () => ({
    active_gateway: payment.active_gateway,
    default_currency: payment.default_currency,
    country: payment.country,
    gateway_mode: payment.gateway_mode,
    stripe_enabled: payment.active_gateway === 'stripe' || payment.stripe_enabled,
    stripe_account_id: payment.stripe_account_id || '',
    stripe_publishable_key: payment.stripe_publishable_key || '',
    stripe_secret_key: stripeSecretKey,
    stripe_webhook_secret: stripeWebhookSecret,
    razorpay_enabled: payment.active_gateway === 'razorpay' || payment.razorpay_enabled,
    razorpay_key_id: payment.razorpay_key_id || '',
    razorpay_key_secret: razorpaySecret,
    cash_enabled: payment.cash_enabled,
    card_enabled: payment.card_enabled,
    bank_transfer_enabled: payment.bank_transfer_enabled,
    deposit_type: payment.deposit_type,
    deposit_value: Number(payment.deposit_value || 0),
    cancellation_free_hours: Number(payment.cancellation_free_hours || 24),
    cancellation_penalty_percent: Number(payment.cancellation_penalty_percent || 0),
  });

  const handleSavePortal = async () => {
    setIsSavingPortal(true);
    try {
      const nextBranding = await apiJSON<Record<string, unknown>>('/hotel/branding', {
        method: 'PUT',
        body: JSON.stringify({
          hotel_id: branding.hotel_id,
          hotel_name: branding.hotel_name,
          logo_url: branding.logo_url || null,
          primary_color: branding.admin_primary_color || branding.primary_color || '#000000',
          admin_primary_color: branding.admin_primary_color || branding.primary_color || '#000000',
          client_primary_color: branding.client_primary_color || branding.primary_color || '#000000',
          welcome_message: branding.welcome_message || null,
          footer_text: branding.footer_text || null,
        }),
      });
      const nextPayment = await apiJSON<PaymentSettings>('/settings/payment', {
        method: 'PUT',
        body: JSON.stringify(buildPaymentPayload()),
      });
      setBranding({
        ...branding,
        hotel_name: String(nextBranding.hotel_name || branding.hotel_name),
        logo_url: String(nextBranding.logo_url || branding.logo_url || ''),
        primary_color: String(nextBranding.primary_color || branding.primary_color || '#000000'),
        admin_primary_color: String(nextBranding.admin_primary_color || nextBranding.primary_color || branding.admin_primary_color || '#000000'),
        client_primary_color: String(nextBranding.client_primary_color || nextBranding.primary_color || branding.client_primary_color || '#000000'),
        welcome_message: String(nextBranding.welcome_message || branding.welcome_message || ''),
        footer_text: String(nextBranding.footer_text || branding.footer_text || ''),
      });
      applyAdminBrandTheme({
        primary_color: String(nextBranding.primary_color || branding.primary_color || '#000000'),
        admin_primary_color: String(nextBranding.admin_primary_color || nextBranding.primary_color || branding.admin_primary_color || '#000000'),
      });
      setPayment({ ...payment, ...nextPayment });
      sessionStorage.removeItem('hotel_branding');
      toast({ title: 'Portal settings saved', description: 'Branding and currency will now appear in both portals.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save portal settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPortal(false);
    }
  };

  const handleSavePayments = async () => {
    setIsSavingPayments(true);
    try {
      const nextPayment = await apiJSON<PaymentSettings>('/settings/payment', {
        method: 'PUT',
        body: JSON.stringify(buildPaymentPayload()),
      });
      setPayment({ ...payment, ...nextPayment });
      setStripeSecretKey('');
      setStripeWebhookSecret('');
      setRazorpaySecret('');
      sessionStorage.removeItem('hotel_branding');
      toast({ title: 'Payment settings saved', description: 'Gateway, credentials, and default currency were updated.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save payment settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPayments(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsSavingAccount(true);
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
    setIsSavingAccount(false);
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

    setIsSavingAccount(true);
    const { error } = await supabase.auth.updateUser({ current_password: currentPassword, password: newPassword });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsSavingAccount(false);
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portal Settings</h2>
          <p className="text-muted-foreground">Configure hotel branding, currency, gateways, and admin account controls.</p>
        </div>

        <Tabs defaultValue="portal" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 border-2 sm:grid-cols-5">
            <TabsTrigger value="portal">
              <Palette className="mr-2 h-4 w-4" />
              Portal
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="roles">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Role Portals
            </TabsTrigger>
            <TabsTrigger value="account">
              <User className="mr-2 h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Zap className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="system">
              <Server className="mr-2 h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portal" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Guest and Staff Portal Branding
                  </CardTitle>
                  <CardDescription>Set shared hotel identity and separate colors for each portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Hotel Name</Label>
                      <Input
                        value={branding.hotel_name}
                        onChange={(event) => setBranding({ ...branding, hotel_name: event.target.value })}
                        className="mt-1 border-2"
                        placeholder="The Grand Demo Hotel"
                      />
                    </div>
                    <div>
                      <Label>Admin Portal Color</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          type="color"
                          value={branding.admin_primary_color}
                          onChange={(event) => setBranding({ ...branding, admin_primary_color: event.target.value, primary_color: event.target.value })}
                          className="h-10 w-16 border-2 p-1"
                          aria-label="Admin portal color"
                        />
                        <Input
                          value={branding.admin_primary_color}
                          onChange={(event) => setBranding({ ...branding, admin_primary_color: event.target.value, primary_color: event.target.value })}
                          className="border-2"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Client Portal Color</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        type="color"
                        value={branding.client_primary_color}
                        onChange={(event) => setBranding({ ...branding, client_primary_color: event.target.value })}
                        className="h-10 w-16 border-2 p-1"
                        aria-label="Client portal color"
                      />
                      <Input
                        value={branding.client_primary_color}
                        onChange={(event) => setBranding({ ...branding, client_primary_color: event.target.value })}
                        className="border-2"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      value={branding.logo_url}
                      onChange={(event) => setBranding({ ...branding, logo_url: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Country</Label>
                      <Select value={selectedCountry.country} onValueChange={handleCountryChange}>
                        <SelectTrigger className="mt-1 border-2">
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
                    <div>
                      <Label>Default Currency</Label>
                      <Select value={payment.default_currency} onValueChange={(value) => patchPayment({ default_currency: value })}>
                        <SelectTrigger className="mt-1 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map(option => (
                            <SelectItem key={option.currency} value={option.currency}>
                              {option.currency} - {option.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Welcome Message</Label>
                    <Input
                      value={branding.welcome_message}
                      onChange={(event) => setBranding({ ...branding, welcome_message: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="Welcome to our hotel"
                    />
                  </div>

                  <div>
                    <Label>Footer Text</Label>
                    <Input
                      value={branding.footer_text}
                      onChange={(event) => setBranding({ ...branding, footer_text: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="Powered by HotelOps"
                    />
                  </div>

                  <Button onClick={handleSavePortal} disabled={isSavingPortal}>
                    {isSavingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Portal Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>How the portals will introduce this hotel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 p-4" style={{ borderColor: branding.admin_primary_color }}>
                      <div className="mb-3 text-sm font-bold">Admin Portal</div>
                      <div className="flex items-center gap-3">
                        {branding.logo_url ? (
                          <img src={branding.logo_url} alt="" className="h-12 w-12 border-2 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center border-2" style={{ borderColor: branding.admin_primary_color }}>
                            <Building2 className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold">{branding.hotel_name}</div>
                          <div className="text-sm text-muted-foreground">{branding.welcome_message || 'Welcome'}</div>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Default currency</span>
                          <strong>{payment.default_currency}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Gateway</span>
                          <strong className="capitalize">{payment.active_gateway.replace('_', ' ')}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="border-2 p-4" style={{ borderColor: branding.client_primary_color }}>
                      <div className="mb-3 text-sm font-bold">Client Portal</div>
                      <div className="flex items-center gap-3">
                        {branding.logo_url ? (
                          <img src={branding.logo_url} alt="" className="h-12 w-12 border-2 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center border-2" style={{ borderColor: branding.client_primary_color }}>
                            <Building2 className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold">{branding.hotel_name}</div>
                          <div className="text-sm text-muted-foreground">{branding.welcome_message || 'Welcome'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Gateway Selection
                  </CardTitle>
                  <CardDescription>Choose the payment method guests see first in the portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Active Gateway</Label>
                    <Select value={payment.active_gateway} onValueChange={(value) => patchPayment({ active_gateway: value as Gateway })}>
                      <SelectTrigger className="mt-1 border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None - hold only</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="cash">Cash at hotel</SelectItem>
                        <SelectItem value="card">Card at hotel</SelectItem>
                        <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gateway Mode</Label>
                    <Select value={payment.gateway_mode} onValueChange={(value) => patchPayment({ gateway_mode: value as GatewayMode })}>
                      <SelectTrigger className="mt-1 border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center justify-between border-2 p-3">
                      <Label>Cash</Label>
                      <Switch checked={payment.cash_enabled} onCheckedChange={(checked) => patchPayment({ cash_enabled: checked })} />
                    </div>
                    <div className="flex items-center justify-between border-2 p-3">
                      <Label>Card</Label>
                      <Switch checked={payment.card_enabled} onCheckedChange={(checked) => patchPayment({ card_enabled: checked })} />
                    </div>
                    <div className="flex items-center justify-between border-2 p-3">
                      <Label>Bank</Label>
                      <Switch checked={payment.bank_transfer_enabled} onCheckedChange={(checked) => patchPayment({ bank_transfer_enabled: checked })} />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Deposit Type</Label>
                      <Select value={payment.deposit_type} onValueChange={(value) => patchPayment({ deposit_type: value as 'percentage' | 'fixed' })}>
                        <SelectTrigger className="mt-1 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Deposit Value</Label>
                      <Input
                        type="number"
                        value={payment.deposit_value}
                        onChange={(event) => patchPayment({ deposit_value: Number(event.target.value) })}
                        className="mt-1 border-2"
                      />
                    </div>
                    <div>
                      <Label>Free Cancellation Window (hours)</Label>
                      <Input
                        type="number"
                        value={payment.cancellation_free_hours}
                        onChange={(event) => patchPayment({ cancellation_free_hours: Number(event.target.value) })}
                        className="mt-1 border-2"
                      />
                    </div>
                    <div>
                      <Label>Cancellation Penalty (%)</Label>
                      <Input
                        type="number"
                        value={payment.cancellation_penalty_percent}
                        onChange={(event) => patchPayment({ cancellation_penalty_percent: Number(event.target.value) })}
                        className="mt-1 border-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Stripe Credentials
                  </CardTitle>
                  <CardDescription>Store hotel-owned Stripe keys. Secret values are never returned after saving.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-2 p-3">
                    <div>
                      <Label>Enable Stripe</Label>
                      <p className="text-xs text-muted-foreground">Used when active gateway is Stripe.</p>
                    </div>
                    <Switch checked={payment.stripe_enabled} onCheckedChange={(checked) => patchPayment({ stripe_enabled: checked })} />
                  </div>
                  <div>
                    <Label>Publishable Key</Label>
                    <Input
                      value={payment.stripe_publishable_key || ''}
                      onChange={(event) => patchPayment({ stripe_publishable_key: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="pk_test_..."
                    />
                  </div>
                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={stripeSecretKey}
                      onChange={(event) => setStripeSecretKey(event.target.value)}
                      className="mt-1 border-2"
                      placeholder={payment.stripe_secret_configured ? 'Configured - enter a new key to replace' : 'sk_test_...'}
                    />
                  </div>
                  <div>
                    <Label>Webhook Secret</Label>
                    <Input
                      type="password"
                      value={stripeWebhookSecret}
                      onChange={(event) => setStripeWebhookSecret(event.target.value)}
                      className="mt-1 border-2"
                      placeholder={payment.stripe_webhook_configured ? 'Configured - enter a new secret to replace' : 'whsec_...'}
                    />
                  </div>
                  <div>
                    <Label>Connected Account ID</Label>
                    <Input
                      value={payment.stripe_account_id || ''}
                      onChange={(event) => patchPayment({ stripe_account_id: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="acct_..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BadgeIndianRupee className="h-5 w-5" />
                    Razorpay Credentials
                  </CardTitle>
                  <CardDescription>For Indian hotels that collect through Razorpay checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-2 p-3">
                    <div>
                      <Label>Enable Razorpay</Label>
                      <p className="text-xs text-muted-foreground">Best for INR payments.</p>
                    </div>
                    <Switch checked={payment.razorpay_enabled} onCheckedChange={(checked) => patchPayment({ razorpay_enabled: checked })} />
                  </div>
                  <div>
                    <Label>Key ID</Label>
                    <Input
                      value={payment.razorpay_key_id || ''}
                      onChange={(event) => patchPayment({ razorpay_key_id: event.target.value })}
                      className="mt-1 border-2"
                      placeholder="rzp_test_..."
                    />
                  </div>
                  <div>
                    <Label>Key Secret</Label>
                    <Input
                      type="password"
                      value={razorpaySecret}
                      onChange={(event) => setRazorpaySecret(event.target.value)}
                      className="mt-1 border-2"
                      placeholder={payment.razorpay_secret_configured ? 'Configured - enter a new secret to replace' : 'Razorpay key secret'}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Save Payment Configuration</CardTitle>
                  <CardDescription>Changes apply to the client booking and billing screens after refresh.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 p-4 text-sm">
                    <div className="flex justify-between">
                      <span>Active gateway</span>
                      <strong className="capitalize">{payment.active_gateway.replace('_', ' ')}</strong>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span>Default currency</span>
                      <strong>{payment.default_currency}</strong>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span>Stripe secret</span>
                      <strong>{payment.stripe_secret_configured || stripeSecretKey ? 'Configured' : 'Missing'}</strong>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span>Razorpay secret</span>
                      <strong>{payment.razorpay_secret_configured || razorpaySecret ? 'Configured' : 'Missing'}</strong>
                    </div>
                  </div>
                  <Button onClick={handleSavePayments} disabled={isSavingPayments}>
                    {isSavingPayments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Payment Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Role Portal Control Panel
                </CardTitle>
                <CardDescription>
                  Choose the modules each staff role sees in the admin portal. Backend route permissions still protect restricted actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <div className="space-y-2">
                  {ROLE_PORTAL_ROLES.map(role => {
                    const setting = roleDrafts[role];
                    const preset = rolePortalPreset(role);
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          'w-full border-2 p-3 text-left transition-all',
                          isSelected ? 'border-primary bg-primary text-primary-foreground shadow-xs' : 'border-border hover:bg-accent',
                        )}
                      >
                        <div className="font-bold">{setting?.label || preset.title}</div>
                        <div className={cn('mt-1 text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                          {(setting?.visible_modules || preset.modules).length} visible modules
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                    <div>
                      <h3 className="text-xl font-bold">{selectedRoleSetting.label}</h3>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{selectedRoleSetting.description}</p>
                    </div>
                    <div>
                      <Label>Default Landing Page</Label>
                      <Select
                        value={selectedRoleSetting.default_path}
                        onValueChange={(value) => updateSelectedRoleDraft({ default_path: value })}
                      >
                        <SelectTrigger className="mt-1 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoleNav
                            .filter(item => selectedVisibleModules.has(item.id))
                            .map(item => (
                              <SelectItem key={item.id} value={item.href}>
                                {item.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {availableRoleNav.map(item => {
                      const Icon = item.icon;
                      const checked = selectedVisibleModules.has(item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 border-2 p-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold">{item.label}</div>
                              <div className="truncate text-xs text-muted-foreground">{item.href}</div>
                            </div>
                          </div>
                          <Switch
                            checked={checked}
                            disabled={isLoadingRolePortals || (selectedRoleSetting.visible_modules.length === 1 && checked)}
                            onCheckedChange={(next) => toggleRoleModule(item.id, next)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-2 p-4">
                    <div className="mb-3 text-sm font-bold">What this role sees</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoleSetting.visible_modules.map(moduleID => {
                        const item = navItemByID(moduleID);
                        return item ? (
                          <span key={moduleID} className="border-2 px-2 py-1 text-xs font-medium">
                            {item.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSaveRolePortal} disabled={isSavingRolePortal || isLoadingRolePortals}>
                      {isSavingRolePortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Role Portal
                    </Button>
                    <Button type="button" variant="outline" onClick={resetSelectedRoleDraft}>
                      Reset Recommended
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
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
                      <p className="text-sm text-muted-foreground">{ROLE_LABELS[primaryRole]}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label>Full Name</Label>
                    <Input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} className="mt-1 border-2" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-1 border-2" placeholder="+1 (555) 000-0000" />
                  </div>
                  <Button onClick={handleUpdateProfile} disabled={isSavingAccount}>
                    {isSavingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>Update your password using the current password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 border-2" />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 border-2" />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 border-2" />
                  </div>
                  <Button onClick={handleUpdatePassword} disabled={isSavingAccount || !newPassword || !currentPassword}>
                    {isSavingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Configure your notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ['orderAlerts', 'Order Alerts', 'Get notified for new orders'],
                    ['complaintAlerts', 'Complaint Alerts', 'Get notified for new complaints'],
                    ['stockAlerts', 'Stock Alerts', 'Get notified for low stock items'],
                    ['soundEnabled', 'Sound Enabled', 'Play sound for notifications'],
                  ].map(([key, title, description]) => (
                    <div key={key} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Account
                  </CardTitle>
                  <CardDescription>Session controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-destructive/20 bg-destructive/5 p-4">
                    <h4 className="font-bold text-destructive">Sign Out</h4>
                    <p className="mt-1 text-sm text-muted-foreground">End this staff portal session.</p>
                    <Button variant="destructive" className="mt-4" onClick={signOut}>
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    SMTP Configuration
                  </CardTitle>
                  <CardDescription>Configure outgoing email for booking confirmations, invoices, and alerts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>SMTP Host</Label>
                      <Input className="border-2 mt-1" placeholder="smtp.gmail.com" defaultValue="smtp.gmail.com" />
                    </div>
                    <div className="space-y-1">
                      <Label>Port</Label>
                      <Input className="border-2 mt-1" type="number" placeholder="587" defaultValue="587" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>From Email</Label>
                    <Input className="border-2 mt-1" placeholder="noreply@hotelops.com" defaultValue="snipymart@gmail.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>From Name</Label>
                    <Input className="border-2 mt-1" placeholder="HotelOps" defaultValue="Hotel Harmony" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>SMTP Username</Label>
                      <Input className="border-2 mt-1" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-1">
                      <Label>SMTP Password</Label>
                      <Input className="border-2 mt-1" type="password" placeholder="App password" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-2 p-3">
                    <div><Label>Enable SSL</Label><p className="text-xs text-muted-foreground">Use TLS/SSL for secure connections</p></div>
                    <Switch defaultChecked />
                  </div>
                  <Button><Mail className="mr-2 h-4 w-4" /> Save Email Settings</Button>
                  <Button variant="outline" className="ml-2"><Send className="mr-2 h-4 w-4" /> Send Test Email</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Choose which events trigger automated emails.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ['booking_confirmation', 'Booking Confirmation', 'Sent when a guest completes a reservation'],
                    ['checkin_reminder', 'Check-in Reminder', 'Sent 24 hours before check-in'],
                    ['checkout_feedback', 'Check-out & Feedback', 'Sent after check-out requesting review'],
                    ['invoice_receipt', 'Invoice / Receipt', 'Payment receipt and invoice attachments'],
                    ['promotional', 'Promotional Offers', 'Marketing emails and special offers'],
                    ['system_alerts', 'System Alerts', 'Admin notifications for failures or warnings'],
                  ].map(([key, title, desc]) => (
                    <div key={key} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                      <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                      <Switch defaultChecked={key !== 'promotional'} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Third-Party Integrations
                  </CardTitle>
                  <CardDescription>Connect external services for enhanced functionality.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'OTA Channel Manager', desc: 'Sync rates & availability with Booking.com, Expedia, etc.', status: 'disconnected' },
                    { name: 'Accounting (QuickBooks)', desc: 'Export invoices and payments to QuickBooks', status: 'disconnected' },
                    { name: 'POS System', desc: 'Connect external POS for F&B billing', status: 'disconnected' },
                    { name: 'Property Management (PMS)', desc: 'Legacy PMS data import/export', status: 'disconnected' },
                    { name: 'Analytics (Google)', desc: 'Track portal traffic and conversion metrics', status: 'disconnected' },
                    { name: 'SMS Gateway', desc: 'Transactional SMS for booking alerts', status: 'configured' },
                  ].map((int, i) => (
                    <div key={i} className="flex items-center justify-between border-2 p-3">
                      <div><p className="font-medium">{int.name}</p><p className="text-xs text-muted-foreground">{int.desc}</p></div>
                      <Badge variant={int.status === 'configured' ? 'default' : 'outline'} className={cn(int.status === 'configured' && 'bg-green-100 text-green-800 border-green-400')}>{int.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    API Keys & Webhooks
                  </CardTitle>
                  <CardDescription>Manage API keys for external access and webhook endpoints.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>API Key (Primary)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input className="border-2 flex-1 font-mono text-xs" readOnly value="hms_api_live_xxxxxxxxxxxxx" />
                      <Button variant="outline" size="sm">Regenerate</Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Webhook URL</Label>
                    <Input className="border-2 mt-1 font-mono text-xs" value="https://api.hotelops.local/webhooks/v1" />
                  </div>
                  <div className="space-y-1">
                    <Label>Webhook Secret</Label>
                    <Input className="border-2 mt-1 font-mono text-xs" type="password" value="whsec_xxxxxxxxxxxxx" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Webhook Events</Label>
                    {['booking.created', 'booking.cancelled', 'payment.completed', 'night_audit.completed', 'invoice.generated'].map(evt => (
                      <div key={evt} className="flex items-center justify-between border-b pb-2">
                        <span className="font-mono text-xs">{evt}</span>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                  <Button><Save className="mr-2 h-4 w-4" /> Save Integration Settings</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Admin Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* System Health */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Health
                  </CardTitle>
                  <CardDescription>Real-time system component status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      ['API Server', 'Healthy', '15%'],
                      ['Database', 'Healthy', '20%'],
                      ['Web Server', 'Healthy', '10%'],
                      ['Email Service', 'Healthy', '5%'],
                      ['Memory', 'Healthy', '45%'],
                      ['Disk', 'Healthy', '60%'],
                    ].map(([component, status, usage]) => (
                      <div key={component as string} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                        <div>
                          <p className="font-medium">{component as string}</p>
                          <p className="text-xs text-muted-foreground">{status as string}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
                            <div className={cn('h-full rounded-full', parseInt(usage as string) > 80 ? 'bg-destructive' : parseInt(usage as string) > 50 ? 'bg-amber-500' : 'bg-green-500')} style={{width: usage}} />
                          </div>
                          <span className="text-sm font-mono">{usage as string}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Backup Management */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Backup Management
                  </CardTitle>
                  <CardDescription>Schedule and manage system backups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Backup Schedule</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Daily</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono">02:00 AM UTC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Retention</span>
                      <span>30 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Auto Backup</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                  </div>
                  <div className="border-2 p-4">
                    <h4 className="font-medium mb-2">Recent Backups</h4>
                    <div className="space-y-2 text-sm">
                      {[
                        ['BK-001', '15 Jun 2026', '2.5 GB', 'Completed'],
                        ['BK-002', '14 Jun 2026', '2.4 GB', 'Completed'],
                        ['BK-003', '13 Jun 2026', '2.4 GB', 'Completed'],
                      ].map(([id, date, size, status]) => (
                        <div key={id as string} className="flex justify-between items-center border-b pb-1 last:border-b-0">
                          <span className="font-mono text-xs">{id as string}</span>
                          <span className="text-muted-foreground">{date as string}</span>
                          <span>{size as string}</span>
                          <Badge variant="outline" className="text-xs">{status as string}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Database className="h-4 w-4 mr-2" /> Create Manual Backup
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Audit Logs */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>Recent system activity and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    ['15 Jun 14:30', 'User admin updated payment settings', 'info'],
                    ['15 Jun 14:25', 'Payment processing timeout on booking RES-123', 'warning'],
                    ['15 Jun 14:20', 'New reservation created for John Doe (RM 305)', 'info'],
                    ['15 Jun 14:15', 'Database backup completed successfully', 'info'],
                    ['15 Jun 14:10', 'Failed login attempt for user guest1@gmail.com', 'warning'],
                    ['15 Jun 14:05', 'Housekeeping task TASK-042 marked as done', 'info'],
                  ].map(([time, message, level], i) => (
                    <div key={i} className="flex items-start gap-3 border-b pb-2 last:border-b-0">
                      <div className={cn(
                        'mt-1 h-2 w-2 rounded-full shrink-0',
                        level === 'error' ? 'bg-destructive' : level === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{message as string}</p>
                        <p className="text-xs text-muted-foreground">{time as string}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        'text-xs capitalize',
                        level === 'error' && 'border-destructive text-destructive',
                        level === 'warning' && 'border-amber-500 text-amber-700',
                        level === 'info' && 'border-blue-500 text-blue-700',
                      )}>{level as string}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
