import { useEffect, useRef } from 'react';

export interface LiveSyncEvent {
  type: string;
  entityId?: string;
  role?: string;
  metadata?: any;
  version: number;
  timestamp: number;
}

let globalLatestVersion = 0;
let activeEventSource: EventSource | null = null;
let heartbeatTimer: any = null;
let reconnectTimer: any = null;

function resolveLiveBaseUrl(): string {
  const backendBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return backendBase;
}

/**
 * Initializes global real-time synchronization between Admin, Vendor, and Employee sessions.
 * Combines high-speed Server-Sent Events (SSE) for millisecond responsiveness with
 * 4-second heartbeat polling fallback for proxy/network resilience.
 */
export function useRealtimeSync() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    function dispatchSync(eventData: any) {
      if (!isMountedRef.current) return;
      if (eventData?.version) {
        if (eventData.version <= globalLatestVersion) return;
        globalLatestVersion = eventData.version;
      }
      try {
        window.dispatchEvent(new CustomEvent('safal_live_sync', { detail: eventData }));
      } catch (err) {
        console.warn('[LiveSync] Dispatch error:', err);
      }
    }

    async function checkHeartbeat() {
      try {
        const base = resolveLiveBaseUrl();
        const res = await fetch(`${base}/api/live/heartbeat`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.version === 'number') {
          if (globalLatestVersion === 0) {
            globalLatestVersion = data.version;
          } else if (data.version > globalLatestVersion) {
            globalLatestVersion = data.version;
            dispatchSync({ type: 'HEARTBEAT_SYNC', version: data.version });
          }
        }
      } catch {
        // Heartbeat network error silently ignored
      }
    }

    function connectSSE() {
      if (activeEventSource) {
        try {
          activeEventSource.close();
        } catch {}
      }

      const base = resolveLiveBaseUrl();
      const token = localStorage.getItem('token') || '';
      const streamUrl = `${base}/api/live/stream?token=${encodeURIComponent(token)}`;

      try {
        const es = new EventSource(streamUrl);
        activeEventSource = es;

        es.addEventListener('connected', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data?.version && data.version > globalLatestVersion) {
              globalLatestVersion = data.version;
            }
          } catch {}
        });

        es.addEventListener('safal_sync', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            dispatchSync(data);
          } catch (err) {
            console.warn('[LiveSync] Failed to parse event packet:', err);
          }
        });

        es.onerror = () => {
          try {
            es.close();
          } catch {}
          activeEventSource = null;
          // Reconnect with 3.5s backoff
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (isMountedRef.current) connectSSE();
          }, 3500);
        };
      } catch {
        // SSE unsupported or blocked, fallback to polling
      }
    }

    // Connect SSE and start 4-second heartbeat fallback loop
    connectSSE();
    checkHeartbeat();
    heartbeatTimer = setInterval(checkHeartbeat, 4000);

    return () => {
      isMountedRef.current = false;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (activeEventSource) {
        try {
          activeEventSource.close();
        } catch {}
        activeEventSource = null;
      }
    };
  }, []);
}

/**
 * Convenient React hook for pages and components to react to live background data updates.
 */
export function useLiveSyncListener(callback: (event: LiveSyncEvent) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (cbRef.current) {
        cbRef.current(e.detail);
      }
    };
    window.addEventListener('safal_live_sync', handler as EventListener);
    return () => {
      window.removeEventListener('safal_live_sync', handler as EventListener);
    };
  }, []);
}
