/**
 * DEV CHAT — Production Service Worker
 * Comprehensive PWA support: offline app shell, network-first navigation with offline fallback,
 * stale-while-revalidate for static assets, secure bypass for Firestore & auth tokens.
 */

const CACHE_NAME = 'dev-chat-v1.0.0';

// Essential application shell assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/site.webmanifest',
  '/manifest.webmanifest',
  '/.well-known/assetlinks.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

// Domains and endpoints that must NEVER be cached (private chat data, auth, Firestore, realtime sync)
const NO_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseio.com',
  'firebasestorage.googleapis.com',
  'firebase.googleapis.com',
  'generativelanguage.googleapis.com',
];

// Install Event — precache core app shell and offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Activate immediately when requested
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Precache failed, will cache on demand:', err);
      })
  );
});

// Activate Event — cleanup old versioned caches and claim active clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Removing outdated cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Message Event — handle manual update triggers from the UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event — smart caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only handle standard HTTP/HTTPS schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 2. Only cache GET requests. Mutation requests (POST, PUT, DELETE) go direct to network
  if (request.method !== 'GET') {
    return;
  }

  // 3. SECURITY: Never cache sensitive API calls, authentication tokens, Firestore queries, or WebSockets
  const isNoCacheHost = NO_CACHE_HOSTS.some((host) => url.hostname.includes(host));
  const isApiRoute = url.pathname.startsWith('/api/');
  const hasAuthHeader = request.headers.has('Authorization');

  if (isNoCacheHost || isApiRoute || hasAuthHeader) {
    // Network-only for live messaging and auth data
    return;
  }

  // 4. HTML Navigation Requests (e.g. user visits '/', '/login', '/chat', etc.)
  // Strategy: Network-First with fallback to cached index.html or offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If network succeeded, optionally cache a copy of the root shell
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) {
            return cachedIndex;
          }
          const offlinePage = await cache.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          return new Response('You are offline. Please reconnect to use DEV CHAT.', {
            headers: { 'Content-Type': 'text/plain' },
            status: 503,
          });
        })
    );
    return;
  }

  // 5. Static Assets (CSS, JS, Fonts, Images, Icons, Manifest)
  // Strategy: Stale-While-Revalidate for fast loading and offline resilience
  const isStaticAsset =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.includes('/.well-known/') ||
    url.pathname.includes('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch fresh copy from network in parallel
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, copy).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failure is expected when offline
            return null;
          });

        // Return cached version immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise.then((res) => res || new Response('Asset Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } }));
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
