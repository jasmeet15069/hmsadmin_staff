import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface Reservation {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in_date: string;
  check_out_date: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  room_number: string;
  room_type: string;
  total_amount: number | null;
  nights: number;
  status: 'upcoming' | 'pending_checkin' | 'in_house' | 'checked_out';
  created_at: string;
}

export interface CalendarDay {
  date: string;
  check_ins: number;
  check_outs: number;
  occupied: number;
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: { status?: string; search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      const res = await fetch(`${API_BASE}/reservations?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setReservations(json.data || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (data: {
    guest_name: string; guest_email?: string; guest_phone?: string;
    room_id: string; check_in_date: string; check_out_date: string; notes?: string;
  }) => {
    const res = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create');
    await fetch();
    return json.data;
  };

  const cancel = async (id: string) => {
    const res = await fetch(`${API_BASE}/reservations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel');
    await fetch();
  };

  const checkIn = async (id: string) => {
    const res = await fetch(`${API_BASE}/reservations/${id}/checkin`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check in');
    await fetch();
  };

  const checkOut = async (id: string) => {
    const res = await fetch(`${API_BASE}/reservations/${id}/checkout`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check out');
    await fetch();
  };

  const getCalendar = async (month?: string): Promise<CalendarDay[]> => {
    const m = month || new Date().toISOString().slice(0, 7);
    const res = await fetch(`${API_BASE}/reservations/calendar?month=${m}`);
    const json = await res.json();
    return json.data || [];
  };

  return { reservations, loading, error, fetch, create, cancel, checkIn, checkOut, getCalendar };
}
