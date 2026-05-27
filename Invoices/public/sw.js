// public/sw.js - Bulletproof PWA SW for Invoice App (API Bypass Edition)
const CACHE_NAME = 'invoice-app-v2';  // Bump version to invalidate old caches
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/vite.svg'  // Add any other static files as needed
];

// Install: Cache basics
self.addEventListener('install', (event) => {
  console.log('SW: Installing v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old versions
self.addEventListener('activate', (event) => {
  console.log('SW: Activating v2...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: STRICT BYPASS FOR API + PDFs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL BYPASS: All API routes (including /api/pdf/*) - direct to network
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    console.log('SW: BYPASSING API (direct network):', url.pathname);
    return;  // No respondWith - browser fetches directly
  }

  // BYPASS: PDF blobs or downloads (if any static ones)
  if (event.request.destination === 'document' || url.pathname.includes('.pdf')) {
    console.log('SW: BYPASSING PDF/binary:', url.pathname);
    return;
  }

  // Cache-only for static assets (network-first fallback)
  if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Default: Network-first with offline cache fallback (non-API)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});