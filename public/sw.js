const CACHE_NAME = 'json-to-excel-v1.2.0';
const STATIC_CACHE = 'static-v1.2.0';

// Essential files for PWA
const ESSENTIAL_FILES = [
  '/',
  '/manifest.json',
  '/icon-192.png', 
  '/icon-512.png'
];

// Dynamic cache patterns
const CACHE_PATTERNS = [
  /\/_next\/static\//,
  /\.js$/,
  /\.css$/,
  /\.woff2?$/
];

// Install event - Cache essential files
self.addEventListener('install', function(event) {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('� Caching essential files');
        return cache.addAll(ESSENTIAL_FILES);
      })
      .then(function() {
        console.log('✅ Essential files cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(function(error) {
        console.error('❌ Cache failed:', error);
      })
  );
});

// Fetch olayı - Offline desteği
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache'de varsa, cache'den döndür
        if (response) {
          return response;
        }
        
        // Cache'de yoksa, network'ten al
        return fetch(event.request).then(
          function(response) {
            // Geçerli response kontrolü
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Response'u clone et (bir kez kullanılabilir)
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Güncelleme olayı
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background Sync - Offline işlemler için
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync tetiklendi');
    // Offline iken yapılan işlemleri burada handle edebilirsiniz
  }
});

// Push bildirimleri (opsiyonel)
self.addEventListener('push', function(event) {
  const options = {
    body: 'JSON dosyanız başarıyla işlendi!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'json-processed',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification('JSON to Excel', options)
  );
});

// Bildirim tıklama
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});