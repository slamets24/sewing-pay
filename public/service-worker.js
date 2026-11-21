const CACHE = 'opsew-offline-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/offline.html')));
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;

    event.respondWith(fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE);
        return cache.match('/offline.html');
    }));
});
