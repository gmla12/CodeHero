const CACHE_NAME = 'codehero-v18-manifest-fix';
const ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/css/style.css',
    '/css/components.css',
    '/css/admin.css',
    '/css/game.css',
    '/manifest.json',
    './js/config.js',
    './js/utils/helpers.js',
    './js/core/GameState.js',
    './js/core/LoopSystem.js',
    './js/ui/AvatarEditor.js',
    './js/ui/UIRenderer.js',
    './js/ui/GridRenderer.js',
    './js/ui/Timeline.js',
    './js/ui/DashboardRenderer.js',
    './js/managers/DataManager.js',
    './js/managers/BotManager.js',
    './js/managers/UserManager.js',
    './js/managers/LevelManager.js',
    './js/core/GameEngine.js',
    './js/main.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Force activation
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            return self.clients.claim(); // Moved inside waitUntil promise chain
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Network First for HTML/JSON to ensure fresh content during dev
    if (e.request.destination === 'document' || e.request.url.endsWith('.json')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
