import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/auth';
import { ROLE_PORTAL_ROLES, rolePortalPreset } from '@/lib/staffNavigation';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface RolePortalSetting {
  role: AppRole;
  label: string;
  description: string;
  default_path: string;
  visible_modules: string[];
  locked?: boolean;
  updated_at?: string;
}

export type RolePortalSettingsMap = Partial<Record<AppRole, RolePortalSetting>>;

function sessionAuthHeader() {
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

function presetMap(): RolePortalSettingsMap {
  return ROLE_PORTAL_ROLES.reduce<RolePortalSettingsMap>((acc, role) => {
    const preset = rolePortalPreset(role);
    acc[role] = {
      role,
      label: preset.title,
      description: preset.description,
      default_path: preset.defaultPath,
      visible_modules: [...preset.modules],
    };
    return acc;
  }, {});
}

export function useRolePortalSettings() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<RolePortalSettingsMap>(() => presetMap());
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setSettings(presetMap());
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/role-portals`, {
        headers: {
          'Content-Type': 'application/json',
          ...sessionAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error) throw new Error(payload.error || 'Unable to load role portals');

      const rows = Array.isArray(payload.data) ? payload.data : [];
      const next = presetMap();
      rows.forEach((row: RolePortalSetting) => {
        next[row.role] = {
          ...next[row.role],
          ...row,
          visible_modules: Array.isArray(row.visible_modules) ? row.visible_modules : next[row.role]?.visible_modules || [],
        };
      });
      setSettings(next);
    } catch {
      setSettings(presetMap());
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveRoleSettings = useCallback(async (setting: Pick<RolePortalSetting, 'role' | 'default_path' | 'visible_modules'>) => {
    const response = await fetch(`${API_BASE}/settings/role-portals`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...sessionAuthHeader(),
      },
      body: JSON.stringify(setting),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) throw new Error(payload.error || 'Unable to save role portal');

    const row = payload.data as RolePortalSetting;
    setSettings(prev => ({
      ...prev,
      [row.role]: {
        ...prev[row.role],
        ...row,
      },
    }));
    return row;
  }, []);

  return { settings, isLoading, refresh, saveRoleSettings };
}
