const CACHE_NAME = "odesa-alert-v4";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];
self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache => cache.addAll(FILES))
    );
    self.skipWaiting();
  }
);
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
                key => key !== CACHE_NAME
              )
              .map(
                key => caches.delete(key)
              )
          );
        })
    );
    self.clients.claim();
  }
);
self.addEventListener(
  "fetch",
  event => {
    if(
      event.request.method !== "GET"
    ){
      return;
    }
    const url =
      new URL(
        event.request.url
      );
    /*
      STATUS.JSON
      НІКОЛИ НЕ КЕШУЄМО.
      Завжди йдемо напряму в мережу.
    */
    if(
      url.pathname.endsWith(
        "/status.json"
      )
    ){
      event.respondWith(
        fetch(
          event.request,
          {
            cache:"no-store"
          }
        )
      );
      return;
    }
    /*
      Інші файли:
      спочатку мережа,
      якщо мережі немає —
      беремо кеш.
    */
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if(
            response &&
            response.ok
          ){
            const copy =
              response.clone();
            caches
              .open(CACHE_NAME)
              .then(cache => {
                cache.put(
                  event.request,
                  copy
                );
              })
              .catch(
                () => {}
              );
          }
          return response;
        })
        .catch(
          () =>
            caches.match(
              event.request
            )
        )
    );
  }
);
/*
  Клік по повідомленню
*/
self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({
        type:"window",
        includeUncontrolled:true
      })
      .then(clientList => {
        for(
          const client
          of clientList
        ){
          if(
            "focus" in client
          ){
            return client.focus();
          }
        }
        if(
          clients.openWindow
        ){
          return clients.openWindow(
            "./"
          );
        }
      })
    );
  }
);
