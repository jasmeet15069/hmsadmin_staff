import { useEffect, useState } from 'react';

export interface HotelBranding {
  hotel_id: string;
  hotel_name?: string;
  slug?: string;
  logo_url?: string | null;
  primary_color: string;
  client_primary_color?: string | null;
  admin_primary_color?: string | null;
  welcome_message?: string | null;
  footer_text?: string | null;
  country?: string | null;
  currency?: string | null;
}

const CACHE_KEY = 'hotel_branding';
const CACHE_TTL_MS = 60 * 60 * 1000;

const fallbackBranding: HotelBranding = {
  hotel_id: '00000000-0000-0000-0000-000000000001',
  hotel_name: 'HotelOps',
  primary_color: '#000000',
  country: 'United States',
  currency: 'USD',
};

function hexToHsl(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '0 0% 0%';
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function foregroundFor(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '0 0% 100%';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '0 0% 0%' : '0 0% 100%';
}

export function applyAdminBrandTheme(branding: Pick<HotelBranding, 'primary_color' | 'admin_primary_color'>) {
  const color = branding.admin_primary_color || branding.primary_color || '#000000';
  const hsl = hexToHsl(color);
  const foreground = foregroundFor(color);
  document.documentElement.style.setProperty('--brand-color', color);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  document.documentElement.style.setProperty('--sidebar-primary', hsl);
  document.documentElement.style.setProperty('--primary-foreground', foreground);
  document.documentElement.style.setProperty('--sidebar-primary-foreground', foreground);
}

function readCachedBranding() {
  const raw = sessionStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as { cached_at: number; data: HotelBranding };
    if (Date.now() - cached.cached_at <= CACHE_TTL_MS) return cached.data;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
  }
  return null;
}

export function useHotelBranding() {
  const [branding, setBranding] = useState<HotelBranding>(() => readCachedBranding() || fallbackBranding);
  const [isLoading, setIsLoading] = useState(!readCachedBranding());

  useEffect(() => {
    const cached = readCachedBranding();
    if (cached) {
      setBranding(cached);
      applyAdminBrandTheme(cached);
      setIsLoading(false);
    }

    let cancelled = false;
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const loadBranding = () => {
      fetch(`${apiBase}/hotel/branding`)
        .then(response => response.json())
        .then(payload => {
          const data = (payload.data || fallbackBranding) as HotelBranding;
          if (cancelled) return;
          setBranding(data);
          applyAdminBrandTheme(data);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ cached_at: Date.now(), data }));
        })
        .catch(() => {
          if (!cancelled) applyAdminBrandTheme(fallbackBranding);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    };

    loadBranding();
    window.addEventListener('focus', loadBranding);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadBranding);
    };
  }, []);

  return { branding, isLoading };
}
