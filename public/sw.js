const CACHE_NAME = 'json-to-excel-v1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/page.css'
];

// Yükleme olayı
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('🚀 PWA Cache açıldı');
        return cache.addAll(urlsToCache);
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