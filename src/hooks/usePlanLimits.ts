import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export type PlanID = 'basic' | 'pro' | 'premium';

export interface PlanLimits {
  plan: PlanID;
  plan_name: string;
  settings: Record<string, unknown>;
  rooms_used: number;
  rooms_max: number | null;
  users_used: number;
  users_max: number | null;
  properties_used: number;
  properties_max: number | null;
  allowed_roles: string[];
  ai_addon: boolean;
  ai_voice_agent: boolean;
  ai_voice_booking: boolean;
  database_strategy?: string;
}

function authHeader(): Record<string, string> {
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

function asPlan(value: unknown): PlanID {
  return value === 'premium' || value === 'pro' || value === 'basic' ? value : 'basic';
}

function normalizeLimits(payload: Partial<PlanLimits>): PlanLimits {
  const settings = payload.settings || {};
  const allowedRoles = Array.isArray(payload.allowed_roles)
    ? payload.allowed_roles.map(String)
    : Array.isArray(settings.allowed_roles)
      ? settings.allowed_roles.map(String)
      : [];

  return {
    plan: asPlan(payload.plan),
    plan_name: payload.plan_name || String(payload.plan || 'Basic'),
    settings,
    rooms_used: Number(payload.rooms_used || 0),
    rooms_max: payload.rooms_max == null ? null : Number(payload.rooms_max),
    users_used: Number(payload.users_used || 0),
    users_max: payload.users_max == null ? null : Number(payload.users_max),
    properties_used: Number(payload.properties_used || 0),
    properties_max: payload.properties_max == null ? null : Number(payload.properties_max),
    allowed_roles: allowedRoles,
    ai_addon: Boolean(payload.ai_addon ?? settings.ai_addon),
    ai_voice_agent: Boolean(payload.ai_voice_agent ?? settings.ai_voice_agent),
    ai_voice_booking: Boolean(payload.ai_voice_booking ?? settings.ai_voice_booking),
    database_strategy: String(payload.database_strategy || settings.database_strategy || 'tenant_isolated'),
  };
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/plan/limits`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.error) {
        throw new Error(payload.error || res.statusText || 'Unable to load plan limits');
      }
      setLimits(normalizeLimits(payload.data || {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load plan limits');
      setLimits(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ limits, loading, error, refresh }), [limits, loading, error, refresh]);
}

