import type { Database } from './types';

type AuthUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
};

type Session = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type ApiResult<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

type Filter = {
  column: string;
  operator: 'eq' | 'is';
  value: unknown;
};

type OrderSpec = {
  column: string;
  ascending: boolean;
};

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787/api').replace(/\/$/, '');
const SESSION_KEY = 'hotel_harmony_session';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: null, error: { message: payload.error || response.statusText, code: payload.code } };
    }
    return { data: payload.data ?? null, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'API request failed' } };
  }
}

function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

class QueryBuilder<T = unknown> implements PromiseLike<ApiResult<T>> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectClause = '*';
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private body: unknown;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(private table: string) {}

  select(columns = '*') {
    this.selectClause = columns;
    return this;
  }

  insert(values: unknown) {
    this.action = 'insert';
    this.body = values;
    return this;
  }

  update(values: unknown) {
    this.action = 'update';
    this.body = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this as unknown as PromiseLike<ApiResult<T>>;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this as unknown as PromiseLike<ApiResult<T>>;
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<ApiResult<T>> {
    const payload = {
      select: this.selectClause,
      filters: this.filters,
      orders: this.orders,
      values: this.body,
      single: this.singleMode,
    };

    const encodedTable = encodeURIComponent(this.table);
    if (this.action === 'select') {
      const params = new URLSearchParams({
        select: this.selectClause,
        filters: JSON.stringify(this.filters),
        orders: JSON.stringify(this.orders),
        single: this.singleMode || '',
      });
      return apiRequest<T>(`/tables/${encodedTable}?${params.toString()}`);
    }

    const method = this.action === 'insert' ? 'POST' : this.action === 'update' ? 'PATCH' : 'DELETE';
    return apiRequest<T>(`/tables/${encodedTable}`, {
      method,
      body: JSON.stringify(payload),
    });
  }
}

const authListeners = new Set<(event: string, session: Session | null) => void>();
const POLL_MS = 4000;

type LocalChannel = {
  on: (event: string, filter: unknown, callback: () => void) => LocalChannel;
  subscribe: () => LocalChannel;
  __stop: () => void;
};

function notifyAuth(event: string, session: Session | null) {
  authListeners.forEach((listener) => listener(event, session));
}

export const supabase = {
  from<TTable extends keyof Database['public']['Tables'] & string>(table: TTable) {
    return new QueryBuilder(table);
  },

  channel() {
    const callbacks = new Set<() => void>();
    let intervalId: ReturnType<typeof window.setInterval> | null = null;
    let focusHandler: (() => void) | null = null;
    const channel: LocalChannel = {
      on(_event: string, _filter: unknown, callback: () => void) {
        callbacks.add(callback);
        return this;
      },
      subscribe() {
        const notify = () => callbacks.forEach(callback => callback());
        intervalId = window.setInterval(notify, POLL_MS);
        focusHandler = () => {
          if (document.visibilityState === 'visible') notify();
        };
        window.addEventListener('focus', focusHandler);
        document.addEventListener('visibilitychange', focusHandler);
        return this;
      },
      __stop() {
        if (intervalId) window.clearInterval(intervalId);
        if (focusHandler) {
          window.removeEventListener('focus', focusHandler);
          document.removeEventListener('visibilitychange', focusHandler);
        }
      },
    };
    return channel;
  },

  removeChannel(channel?: LocalChannel) {
    channel?.__stop();
    return undefined;
  },

  auth: {
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },

    async getSession() {
      return { data: { session: readSession() }, error: null };
    },

    async getUser() {
      return { data: { user: readSession()?.user ?? null }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const { data, error } = await apiRequest<Session>('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data) {
        writeSession(data);
        notifyAuth('SIGNED_IN', data);
      }
      return { data: { session: data }, error };
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) {
      const { data, error } = await apiRequest<Session>('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: options?.data?.full_name }),
      });
      if (data) {
        writeSession(data);
        notifyAuth('SIGNED_IN', data);
      }
      return { data: { session: data }, error };
    },

    async signOut() {
      writeSession(null);
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },

    async updateUser(values: { password?: string }) {
      const session = readSession();
      const { data, error } = await apiRequest<AuthUser>('/auth/user', {
        method: 'PATCH',
        body: JSON.stringify({ ...values, user_id: session?.user.id }),
      });
      if (data && session) {
        const nextSession = { ...session, user: data };
        writeSession(nextSession);
        notifyAuth('USER_UPDATED', nextSession);
      }
      return { data: { user: data }, error };
    },
  },

  functions: {
    async invoke(name: string, options: { body?: unknown } = {}) {
      return apiRequest(`/functions/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify(options.body || {}),
      });
    },
  },
};
