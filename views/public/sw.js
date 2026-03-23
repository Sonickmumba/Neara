// Service Worker for Neara Push Notifications
// Receives push events and shows browser notifications.
// Handles notification clicks to open/focus the correct conversation.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Neara', body: event.data?.text() ?? '' };
  }

  const title = data.title || 'Neara';
  const options = {
    body: data.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: { url: data.url || '/' },
    // Tag groups notifications per conversation — clicking a second message
    // in the same conversation replaces the first notification instead of stacking.
    tag: data.conversationId ? `conv-${data.conversationId}` : 'neara',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
