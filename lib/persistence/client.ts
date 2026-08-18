// BitcoinHub persistence client — anonymous UUID auth + cross-device sync.
// Generates a UUID on first visit (stored in localStorage) and uses it as the
// user identifier for all /api/persistence/sync calls. localStorage is kept
// as the offline fallback + fast first-paint cache. Server is the source of
// truth once a value is hydrated from the network.

const USER_ID_KEY = 'bitcoinhub_user_id_v1';
const SYNC_DEBOUNCE_MS = 800;
const SYNC_TIMEOUT_MS = 5000;

function generateUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function setUserId(id: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(USER_ID_KEY, id); } catch { /* ignore */ }
}

// --- Network helpers ---

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function readServerValue<T>(dataKey: string): Promise<T | null> {
  const userId = getUserId();
  if (!userId) return null;
  try {
    const json = await fetchJson(`/api/persistence/sync?userId=${encodeURIComponent(userId)}&dataKey=${encodeURIComponent(dataKey)}`);
    if (json?.dataValue == null) return null;
    return JSON.parse(json.dataValue) as T;
  } catch {
    return null; // fall back to localStorage silently
  }
}

export async function writeServerValue<T>(dataKey: string, value: T): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;
  try {
    await fetchJson('/api/persistence/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dataKey, dataValue: JSON.stringify(value) }),
    });
    return true;
  } catch {
    return false; // localStorage already saved it; will retry on next change
  }
}

// --- Debounced sync ---

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingValues = new Map<string, unknown>();

export function scheduleSync<T>(dataKey: string, value: T, onLocal?: (v: T) => void): void {
  // Always persist locally first (fast, offline-safe)
  if (onLocal) onLocal(value);
  // Debounce network sync
  pendingValues.set(dataKey, value);
  const existing = pendingTimers.get(dataKey);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingTimers.delete(dataKey);
    const v = pendingValues.get(dataKey) as T | undefined;
    if (v === undefined) return;
    pendingValues.delete(dataKey);
    void writeServerValue(dataKey, v);
  }, SYNC_DEBOUNCE_MS);
  pendingTimers.set(dataKey, timer);
}

// --- React hook ---

import { useEffect, useRef, useState } from 'react';

export function useSyncedStorage<T>(
  dataKey: string,
  initialValue: T,
  localStorageKey?: string,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const fallbackKey = localStorageKey ?? dataKey;
  const [value, setValueState] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Local first-paint: read from localStorage synchronously
      let local: T | null = null;
      try {
        const raw = localStorage.getItem(fallbackKey);
        if (raw) local = JSON.parse(raw) as T;
      } catch { /* ignore */ }

      // 2) Then attempt server sync (faster + cross-device)
      const server = await readServerValue<T>(dataKey);

      if (cancelled) return;
      if (server != null) {
        setValueState(server);
        try { localStorage.setItem(fallbackKey, JSON.stringify(server)); } catch { /* ignore */ }
      } else if (local != null) {
        // First device: push local data up to server
        setValueState(local);
        void writeServerValue(dataKey, local);
      }
      setLoaded(true);
      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [dataKey, fallbackKey]);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState(prev => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(fallbackKey, JSON.stringify(resolved)); } catch { /* ignore */ }
      scheduleSync(dataKey, resolved);
      return resolved;
    });
  }, [dataKey, fallbackKey]);

  return [value, setValue, loaded];
}

// useCallback shim so we don't pull it in twice
import { useCallback } from 'react';