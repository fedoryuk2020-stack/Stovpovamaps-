const CACHE_NAME = "odesa-alert-v4";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./status.json",
  "./icon.svg"
];
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }
  // status.json всегда берем свежий
  if (event.request.url.includes("status.json")) {
    event.respondWith(
      fetch(event.request, {
        cache: "no-store"
      })
    );
    return;
  }
  // Остальные файлы: сначала сеть, при ошибке — кэш
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
// Нажатие на уведомление
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    })
    .then(clientList => {
      // Если Odesa Alert уже открыт — открываем его
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // Если приложение закрыто — открываем сайт
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
    })
  );
});
// Закрытие уведомления
self.addEventListener("notificationclose", event => {
  // Ничего не делаем
});
