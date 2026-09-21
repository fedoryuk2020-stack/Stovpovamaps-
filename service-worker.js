const CACHE_NAME = "odesa-alert-v3";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./status.json",
  "./icon.svg"
];


self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(cache => {

          return cache.addAll(
            FILES
          );

        })

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


self.addEventListener(
  "fetch",
  event => {

    if(
      event.request.method !== "GET"
    ){

      return;

    }


    /*
     * status.json всегда берём свежий
     */

    if(
      event.request.url.includes(
        "status.json"
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
     * Остальные файлы:
     * сначала сеть, потом cache
     */

    event.respondWith(

      fetch(
        event.request
      )
      .then(response => {

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
      .catch(
        () =>
          caches.match(
            event.request
          )
      )

    );

  }
);


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
