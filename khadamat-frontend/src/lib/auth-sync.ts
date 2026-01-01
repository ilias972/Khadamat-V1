// Cross-tab auth synchronization utilities
// Uses BroadcastChannel when available, falls back to localStorage events

export type AuthEventType = 'LOGIN' | 'LOGOUT' | 'REFRESH_FAILED';

export type AuthEvent = {
  type: AuthEventType;
  sourceId: string;
  timestamp: number;
};

const CHANNEL_NAME = 'auth';
const STORAGE_KEY = 'auth-sync-event';

const sourceId = (() => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `auth-${Date.now()}-${Math.random().toString(16).slice(2)}`;
})();

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

const channel = getBroadcastChannel();

export function broadcastAuthEvent(type: AuthEventType): void {
  const event: AuthEvent = {
    type,
    sourceId,
    timestamp: Date.now(),
  };

  if (channel) {
    try {
      channel.postMessage(event);
    } catch {
      // ignore
    }
  } else if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
      // Cleanup to reduce noise
      setTimeout(() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
      }, 0);
    } catch {
      // ignore
    }
  }
}

export function subscribeAuthEvents(onEvent: (event: AuthEvent) => void): () => void {
  const listeners: Array<() => void> = [];

  const handler = (event: AuthEvent) => {
    if (!event || event.sourceId === sourceId) return;
    onEvent(event);
  };

  if (channel) {
    const bcHandler = (e: MessageEvent<AuthEvent>) => {
      handler(e.data);
    };
    channel.addEventListener('message', bcHandler);
    listeners.push(() => channel.removeEventListener('message', bcHandler));
  } else if (typeof window !== 'undefined') {
    const storageHandler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed: AuthEvent = JSON.parse(e.newValue);
        handler(parsed);
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener('storage', storageHandler);
    listeners.push(() => window.removeEventListener('storage', storageHandler));
  }

  return () => {
    listeners.forEach((dispose) => dispose());
  };
}

export function getAuthSourceId(): string {
  return sourceId;
}
