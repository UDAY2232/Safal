import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to automatically detect server-side builds/deployments
 * and seamlessly sync all connected devices (mobile, tablet, desktop) on-time.
 */
export function useLiveAppUpdate() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const localBuildTime =
    typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';
  const currentBuildRef = useRef<string>(localBuildTime);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      // 1. Purge all Service Worker Caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      // 2. Unregister or update active service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
    } catch (e) {
      console.warn('[SAFAL Sync] Cache clear error:', e);
    }
    // 3. Force reload fresh assets from origin server (bypassing browser cache)
    window.location.reload();
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const serverBuildTime = String(data.buildTime || '').trim();

      if (
        serverBuildTime &&
        currentBuildRef.current &&
        serverBuildTime !== currentBuildRef.current
      ) {
        console.log(
          `[SAFAL Sync] New deployment detected on server: ${serverBuildTime} (local: ${currentBuildRef.current})`
        );
        setHasNewVersion(true);

        // If user is not currently looking at the tab (backgrounded on phone or computer),
        // silently update so it's ready the moment they return!
        if (document.hidden) {
          applyUpdate();
        } else {
          // If viewing, start a 4-second auto-update countdown
          setCountdown((prev) => (prev === null ? 4 : prev));
        }
      }
    } catch {
      // Ignore network errors during background polling
    }
  }, [applyUpdate]);

  // Countdown timer when new version is detected while user is actively on page
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) {
        applyUpdate();
      }
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, applyUpdate]);

  useEffect(() => {
    // 1. Initial check 3 seconds after page load
    const initialTimer = setTimeout(checkForUpdate, 3000);

    // 2. Periodic polling every 30 seconds
    const interval = setInterval(checkForUpdate, 30000);

    // 3. Check immediately when device wakes up or tab gains focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdate);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdate);
    };
  }, [checkForUpdate]);

  return {
    hasNewVersion,
    isUpdating,
    countdown,
    applyUpdate,
  };
}
