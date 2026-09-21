const CACHE_NAME = "odesa-alert-v3";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./icon.svg"
];
/*
 * INSTALL
 */
self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(FILES)
        )
    );
    self.skipWaiting();
  }
);
/*
 * ACTIVATE
 */
self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      caches
        .keys()
        .then(keys => {
          return Promise.all(
            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )
          );
        })
    );
    self.clients.claim();
  }
);
/*
 * FETCH
 */
self.addEventListener(
  "fetch",
  event => {
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }
          const copy =
            response.clone();
          caches
            .open(CACHE_NAME)
            .then(cache => {
              cache.put(
                event.request,
                copy
              );
            });
          return response;
        })
        .catch(() => {
          return caches.match(
            event.request
          );
        })
    );
  }
);
/*
 * NOTIFICATION CLICK
 */
self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();
    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(clientList => {
          for (
            const client
            of clientList
          ) {
            if (
              "focus" in client
            ) {
              return client.focus();
            }
          }
          if (
            clients.openWindow
          ) {
            return clients.openWindow(
              "./"
            );
          }
        })
    );
  }
);
