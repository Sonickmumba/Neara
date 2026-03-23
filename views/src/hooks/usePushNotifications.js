import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../services/api';

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 * Required for passing the VAPID public key to PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Manages Web Push subscription lifecycle:
 *  - Registers the service worker once on mount
 *  - Auto-subscribes when the user is logged in and permission is already granted
 *  - Exposes `subscribe()`  — call after user grants permission
 *  - Exposes `unsubscribe()` — call when user disables push in settings
 */
export function usePushNotifications() {
  const { user } = useSelector((s) => s.auth);
  const subscribedRef = useRef(false);

  // Register service worker once
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) =>
        console.warn('[push] Service worker registration failed:', err.message)
      );
  }, []);

  const subscribe = useCallback(async () => {
    if (!navigator.serviceWorker || !window.PushManager) return;
    if (subscribedRef.current) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Fetch the VAPID public key from the server
      const { data } = await apiClient.get('/api/push/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await apiClient.post('/api/push/subscribe', subscription.toJSON());
      subscribedRef.current = true;
    } catch (err) {
      console.warn('[push] subscribe failed:', err.message);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!navigator.serviceWorker) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await apiClient.delete('/api/push/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
        subscribedRef.current = false;
      }
    } catch (err) {
      console.warn('[push] unsubscribe failed:', err.message);
    }
  }, []);

  // Auto-subscribe if already logged in and permission previously granted
  useEffect(() => {
    if (!user) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      subscribe();
    }
  }, [user, subscribe]);

  return { subscribe, unsubscribe };
}
