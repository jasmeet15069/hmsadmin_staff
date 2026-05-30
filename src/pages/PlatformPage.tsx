import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { COUNTRY_OPTIONS } from '@/lib/currency';
import {
  Building2,
  CheckCircle2,
  Database,
  Loader2,
  Mic2,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

type PlanID = 'basic' | 'pro' | 'premium';

interface PlanSpec {
  id: PlanID;
  name: string;
  description: string;
  max_rooms: number | null;
  max_users: number | null;
  max_properties: number | null;
  allowed_roles: string[];
  ai_addon: boolean;
  ai_text_concierge: boolean;
  ai_voice_agent: boolean;
  ai_voice_booking: boolean;
  database_strategy: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanID;
  plan_name: string;
  is_active: boolean;
  country?: string | null;
  currency?: string | null;
  settings: Record<string, unknown>;
  rooms_used: number;
  rooms_max: number | null;
  users_used: number;
  users_max: number | null;
  properties_used: number;
  properties_max: number | null;
  database_name?: string | null;
}

async function apiJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  let authHeader = {};
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    if (session?.access_token) {
      authHeader = { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    authHeader = {};
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(options.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.error) {
    throw new Error(payload.error || res.statusText || 'Request failed');
  }
  return payload.data as T;
}

function limitLabel(value?: number | null) {
  return value == null ? 'Unlimited' : String(value);
}

function planTone(plan: PlanID) {
  if (plan === 'premium') return 'border-purple-500 bg-purple-50';
  if (plan === 'pro') return 'border-blue-500 bg-blue-50';
  return 'border-emerald-500 bg-emerald-50';
}

function tenantAIPlan(settings: Record<string, unknown>) {
  if (Boolean(settings?.ai_voice_booking)) return 'Voice';
  if (Boolean(settings?.ai_addon)) return 'Text';
  return 'Off';
}

export default function PlatformPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanSpec[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanID>>({});
  const [loading, setLoading] = useState(true);
  const [savingTenantID, setSavingTenantID] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: 'Client 1 Hotel',
    slug: 'client-1',
    plan_tier: 'basic' as PlanID,
    country: 'India',
    currency: 'INR',
  });

  const summary = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    premium: tenants.filter(t => t.plan_tier === 'premium').length,
    users: tenants.reduce((sum, tenant) => sum + (tenant.users_used || 0), 0),
  }), [tenants]);

  const load = async () => {
    setLoading(true);
    try {
      const [planData, tenantData] = await Promise.all([
        apiJSON<PlanSpec[]>('/platform/plans'),
        apiJSON<Tenant[]>('/platform/tenants'),
      ]);
      setPlans(planData);
      setTenants(tenantData);
      setPlanDrafts(Object.fromEntries(tenantData.map(tenant => [tenant.id, tenant.plan_tier])));
    } catch (error) {
      toast({
        title: 'Platform unavailable',
        description: error instanceof Error ? error.message : 'Unable to load platform tenants.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCountryChange = (country: string) => {
    const option = COUNTRY_OPTIONS.find(item => item.country === country) || COUNTRY_OPTIONS[0];
    setForm(prev => ({ ...prev, country: option.country, currency: option.currency }));
  };

  const createTenant = async () => {
    setCreating(true);
    try {
      await apiJSON<Tenant>('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast({ title: 'Client tenant created', description: `${form.name} is ready on the ${form.plan_tier} plan.` });
      setForm(prev => ({
        ...prev,
        name: `Client ${tenants.length + 2} Hotel`,
        slug: `client-${tenants.length + 2}`,
      }));
      await load();
    } catch (error) {
      toast({
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Unable to create client tenant.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const updateTenantPlan = async (tenant: Tenant) => {
    const nextPlan = planDrafts[tenant.id] || tenant.plan_tier;
    setSavingTenantID(tenant.id);
    try {
      await apiJSON(`/platform/tenants/${tenant.id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan_tier: nextPlan }),
      });
      toast({ title: 'Plan updated', description: `${tenant.name} is now on ${nextPlan}.` });
      await load();
    } catch (error) {
      toast({
        title: 'Plan update failed',
        description: error instanceof Error ? error.message : 'Unable to update client plan.',
        variant: 'destructive',
      });
    } finally {
      setSavingTenantID(null);
    }
  };

  if (loading) {
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
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Master Platform Portal</h2>
            <p className="text-muted-foreground">
              Control client hotels, plan limits, role access, database aliases, and AI entitlements.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Card className="border-2">
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Active tenants</p>
                <p className="text-2xl font-bold">{summary.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Staff users</p>
                <p className="text-2xl font-bold">{summary.users}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="flex items-center gap-3 p-4">
              <Mic2 className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">AI voice clients</p>
                <p className="text-2xl font-bold">{summary.premium}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.id} className={`border-2 ${planTone(plan.id)}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="mt-1">{plan.description}</CardDescription>
                  </div>
                  {plan.ai_voice_booking ? <Badge>AI Voice</Badge> : plan.ai_addon ? <Badge variant="secondary">AI Text</Badge> : <Badge variant="outline">Core</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="border bg-background p-2">
                    <p className="text-muted-foreground">Rooms</p>
                    <strong>{limitLabel(plan.max_rooms)}</strong>
                  </div>
                  <div className="border bg-background p-2">
                    <p className="text-muted-foreground">Users</p>
                    <strong>{limitLabel(plan.max_users)}</strong>
                  </div>
                  <div className="border bg-background p-2">
                    <p className="text-muted-foreground">Roles</p>
                    <strong>{plan.allowed_roles.length}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.allowed_roles.map(role => (
                    <span key={role} className="border bg-background px-2 py-1 text-xs font-medium">
                      {role.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 border bg-background p-2">
                  <Database className="h-4 w-4" />
                  <span>{plan.database_strategy.replaceAll('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Create Client
              </CardTitle>
              <CardDescription>Each client receives the same portals with plan-specific limits and role access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Client / Hotel Name</Label>
                <Input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="mt-1 border-2" />
              </div>
              <div>
                <Label>Portal Slug</Label>
                <Input value={form.slug} onChange={event => setForm(prev => ({ ...prev, slug: event.target.value }))} className="mt-1 border-2" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <Label>Plan</Label>
                  <Select value={form.plan_tier} onValueChange={(value) => setForm(prev => ({ ...prev, plan_tier: value as PlanID }))}>
                    <SelectTrigger className="mt-1 border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country / Currency</Label>
                  <Select value={form.country} onValueChange={handleCountryChange}>
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
              </div>
              <Button className="w-full" onClick={createTenant} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Create Client Tenant
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Client Tenants</CardTitle>
              <CardDescription>Client 1, Client 2, Client 3, and future hotels are controlled here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenants.map(tenant => (
                <div key={tenant.id} className="grid gap-3 border-2 p-3 lg:grid-cols-[1.1fr_1fr_220px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{tenant.name}</h3>
                      <Badge variant={tenant.is_active ? 'default' : 'outline'}>{tenant.is_active ? 'Active' : 'Paused'}</Badge>
                      <Badge variant="outline">{tenant.plan_name}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      /{tenant.slug} · {tenant.country || 'No country'} · {tenant.currency || 'USD'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Database className="h-3.5 w-3.5" />
                      {String(tenant.database_name || tenant.settings?.database_name || `${tenant.slug}_hotelops`)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="border p-2">
                      <p className="text-muted-foreground">Rooms</p>
                      <strong>{tenant.rooms_used}/{limitLabel(tenant.rooms_max)}</strong>
                    </div>
                    <div className="border p-2">
                      <p className="text-muted-foreground">Users</p>
                      <strong>{tenant.users_used}/{limitLabel(tenant.users_max)}</strong>
                    </div>
                    <div className="border p-2">
                      <p className="text-muted-foreground">AI</p>
                      <strong>{tenantAIPlan(tenant.settings)}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Select
                      value={planDrafts[tenant.id] || tenant.plan_tier}
                      onValueChange={(value) => setPlanDrafts(prev => ({ ...prev, [tenant.id]: value as PlanID }))}
                    >
                      <SelectTrigger className="border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => updateTenantPlan(tenant)}
                      disabled={savingTenantID === tenant.id || (planDrafts[tenant.id] || tenant.plan_tier) === tenant.plan_tier}
                    >
                      {savingTenantID === tenant.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Apply Plan
                    </Button>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <div className="border-2 border-dashed p-8 text-center text-muted-foreground">
                  No client tenants yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
