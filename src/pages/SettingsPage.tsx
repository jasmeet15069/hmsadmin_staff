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
import { ROLE_LABELS } from '@/types/auth';
import { COUNTRY_OPTIONS, getCountryOption } from '@/lib/currency';
import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CreditCard,
  KeyRound,
  Loader2,
  Lock,
  Palette,
  Save,
  Settings,
  ShieldCheck,
  User,
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
    welcome_message: '',
    footer_text: '',
  });
  const [payment, setPayment] = useState<PaymentSettings>(defaultPaymentSettings);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [razorpaySecret, setRazorpaySecret] = useState('');

  const primaryRole = user?.roles.find(r => r !== 'guest') || user?.roles[0] || 'guest';
  const selectedCountry = useMemo(
    () => getCountryOption(payment.country, payment.default_currency),
    [payment.country, payment.default_currency],
  );

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
          primary_color: branding.primary_color || '#000000',
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
        welcome_message: String(nextBranding.welcome_message || branding.welcome_message || ''),
        footer_text: String(nextBranding.footer_text || branding.footer_text || ''),
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
          <TabsList className="grid h-auto w-full grid-cols-2 border-2 sm:grid-cols-4">
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
          </TabsList>

          <TabsContent value="portal" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Guest and Staff Portal Branding
                  </CardTitle>
                  <CardDescription>These values are shared by the client and admin portals.</CardDescription>
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
                      <Label>Primary Color</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          type="color"
                          value={branding.primary_color}
                          onChange={(event) => setBranding({ ...branding, primary_color: event.target.value })}
                          className="h-10 w-16 border-2 p-1"
                          aria-label="Primary color"
                        />
                        <Input
                          value={branding.primary_color}
                          onChange={(event) => setBranding({ ...branding, primary_color: event.target.value })}
                          className="border-2"
                          placeholder="#000000"
                        />
                      </div>
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
                  <div className="border-2 p-4" style={{ borderColor: branding.primary_color }}>
                    <div className="flex items-center gap-3">
                      {branding.logo_url ? (
                        <img src={branding.logo_url} alt="" className="h-12 w-12 border-2 object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center border-2" style={{ borderColor: branding.primary_color }}>
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ['Hotel Admin', 'Full hotel setup, staff, payments, reports, and operations settings.'],
                ['Receptionist', 'Arrivals, departures, room status, guest bookings, complaints, and payments.'],
                ['Housekeeping', 'Room cleaning board, guest requests, inspection status, and room readiness.'],
                ['Maintenance', 'Work orders, room issues, priorities, SLA follow-up, and resolution notes.'],
                ['Food Manager', 'Menu, kitchen inventory, food complaints, suppliers, and stock health.'],
                ['Kitchen Manager', 'Live order queue, preparing/ready workflow, and kitchen stock awareness.'],
                ['Waiter', 'Ready orders, pickup/delivery actions, and active service queue.'],
              ].map(([title, description]) => (
                <Card key={title} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
