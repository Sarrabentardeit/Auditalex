// Service Worker pour le mode hors ligne
const CACHE_NAME = 'audit-hygiene-v2'; // Incrémenté pour forcer la mise à jour du cache
const urlsToCache = [
  '/',
  '/index.html',
  '/data_structure.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de la mise en cache', error);
      })
  );
  // Force l'activation immédiate du nouveau Service Worker
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prend le contrôle de toutes les pages immédiatement
  return self.clients.claim();
});

// Stratégie: Cache First pour les assets statiques, Network First pour les données
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Stratégie Network First pour data_structure.json (toujours vérifier la version en ligne d'abord)
  if (url.pathname === '/data_structure.json') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la requête réussit, mettre à jour le cache et retourner
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si la requête échoue (mode hors ligne), utiliser le cache
          return caches.match(request);
        })
    );
    return;
  }

  // Stratégie Cache First pour les autres assets statiques
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        // Retourner depuis le cache si disponible, sinon fetch
        return response || fetch(request).then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse pour la mettre en cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  } else {
    // Stratégie Network First pour les autres requêtes
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la requête réussit, mettre en cache et retourner
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si la requête échoue, essayer depuis le cache
          return caches.match(request);
        })
    );
  }
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

