import { useEffect, useState } from 'react';

export interface HotelBranding {
  hotel_id: string;
  hotel_name?: string;
  slug?: string;
  logo_url?: string | null;
  primary_color: string;
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

function applyBrandColor(color?: string | null) {
  if (color) {
    document.documentElement.style.setProperty('--brand-color', color);
  }
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
      applyBrandColor(cached.primary_color);
      setIsLoading(false);
    }

    let cancelled = false;
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    fetch(`${apiBase}/hotel/branding`)
      .then(response => response.json())
      .then(payload => {
        const data = (payload.data || fallbackBranding) as HotelBranding;
        if (cancelled) return;
        setBranding(data);
        applyBrandColor(data.primary_color);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ cached_at: Date.now(), data }));
      })
      .catch(() => {
        if (!cancelled) applyBrandColor(fallbackBranding.primary_color);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { branding, isLoading };
}
