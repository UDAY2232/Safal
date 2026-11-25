/**
 * SAFAL Mobile Device Push Notification Utility
 * Provides cross-platform native notification dispatching via Service Worker Registration,
 * vibration feedback, and notification permission management for mobile and desktop browsers.
 */

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registers the SAFAL Service Worker for native mobile notifications and PWA support.
 */
export async function registerSafalServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('SAFAL Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Gets the current notification permission state.
 */
export function getMobilePushStatus(): PushPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionStatus;
}

/**
 * Requests permission from the user to send mobile push notifications.
 * Automatically registers the Service Worker and sends a welcome alert upon approval.
 */
export async function requestMobileNotificationPermission(): Promise<PushPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerSafalServiceWorker();
      await triggerMobileVibration([150, 70, 150]);
      await showNativeMobileNotification({
        title: 'SAFAL Mobile Alerts Active ✓',
        body: 'You will now receive instant push alerts for orders, vehicle dispatch, advances & clearances directly on your phone.',
        tag: 'safal-welcome-alert',
        url: '/dashboard',
      });
    }
    return result as PushPermissionStatus;
  } catch (err) {
    console.warn('Error requesting mobile push permission:', err);
    return 'denied';
  }
}

/**
 * Triggers mobile device hardware vibration if supported.
 */
export function triggerMobileVibration(pattern: number[] = [200, 100, 200]): void {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

/**
 * Dispatches a native mobile notification with app icon, badge, sound & vibration.
 * Prioritizes Service Worker Registration for reliable mobile phone display.
 */
export async function showNativeMobileNotification({
  title,
  body,
  tag,
  url = '/',
}: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  triggerMobileVibration([200, 100, 200]);

  const options: NotificationOptions = {
    body,
    icon: '/favicon-192x192.png',
    badge: '/favicon-96x96.png',
    tag: tag || `safal-${Date.now()}`,
    renotify: true,
    data: { url, timestamp: Date.now() },
  };

  // Try Service Worker registration first (standard for mobile devices)
  try {
    let reg = swRegistration;
    if (!reg && 'serviceWorker' in navigator) {
      reg = (await navigator.serviceWorker.getRegistration()) || (await registerSafalServiceWorker());
    }

    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch (swErr) {
    console.warn('Service worker notification dispatch fallback:', swErr);
  }

  // Fallback to standard Notification constructor
  try {
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('Native notification constructor failed:', err);
    return false;
  }
}

/**
 * Dispatches a test mobile push notification to verify phone reception.
 */
export async function sendTestMobileAlert(): Promise<boolean> {
  return showNativeMobileNotification({
    title: 'SAFAL Mobile Alert Test 🔔',
    body: 'Mobile phone notifications are working perfectly! You will receive daily updates here.',
    tag: 'safal-test-alert',
    url: '/dashboard',
  });
}
