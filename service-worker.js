const CACHE_NAME = "odesa-alert-v4";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];
/* =========================================
   INSTALL
========================================= */
self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(
          cache =>
            cache.addAll(
              APP_FILES
            )
        )
    );
    self.skipWaiting();
  }
);
/* =========================================
   ACTIVATE
========================================= */
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
/* =========================================
   FETCH
========================================= */
self.addEventListener(
  "fetch",
  event => {
    const request =
      event.request;
    if(
      request.method !== "GET"
    ){
      return;
    }
    const url =
      new URL(
        request.url
      );
    /* =====================================
       STATUS.JSON
       Всегда сначала пробуем сеть.
       Если сеть недоступна —
       показываем последний сохранённый статус.
    ===================================== */
    if(
      url.pathname.endsWith(
        "/status.json"
      )
    ){
      event.respondWith(
        fetch(
          request,
          {
            cache:"no-store"
          }
        )
        .then(
          response => {
            if(
              response &&
              response.ok
            ){
              event.waitUntil(
                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    cache =>
                      cache.put(
                        request,
                        response.clone()
                      )
                  )
              );
            }
            return response;
          }
        )
        .catch(
          async () => {
            const cache =
              await caches.open(
                CACHE_NAME
              );
            const cached =
              await cache.match(
                request
              );
            if(cached){
              return cached;
            }
            /*
              Иногда status.json
              был сохранён с другим
              query-параметром.
            */
            const keys =
              await cache.keys();
            const cachedStatus =
              keys.find(
                item =>
                  new URL(
                    item.url
                  ).pathname.endsWith(
                    "/status.json"
                  )
              );
            if(cachedStatus){
              const fallback =
                await cache.match(
                  cachedStatus
                );
              if(fallback){
                return fallback;
              }
            }
            return new Response(
              JSON.stringify({
                status:"safe",
                region:
                  "Одеська область",
                updated_at:null,
                alert_started_at:null,
                history:[],
                stats:{
                  alerts:0,
                  total_minutes:0,
                  average_minutes:0
                },
                source:"offline"
              }),
              {
                status:200,
                headers:{
                  "Content-Type":
                    "application/json"
                }
              }
            );
          }
        )
      );
      return;
    }
    /* =====================================
       HTML
       Сначала пытаемся взять сеть.
       Если сеть недоступна —
       используем кэш.
    ===================================== */
    if(
      request.mode === "navigate" ||
      url.pathname.endsWith(
        "/index.html"
      )
    ){
      event.respondWith(
        fetch(
          request
        )
        .then(
          response => {
            if(
              response &&
              response.ok
            ){
              event.waitUntil(
                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    cache =>
                      cache.put(
                        request,
                        response.clone()
                      )
                  )
              );
            }
            return response;
          }
        )
        .catch(
          async () => {
            const cache =
              await caches.open(
                CACHE_NAME
              );
            return (
              await cache.match(
                request
              )
            ) ||
            (
              await cache.match(
                "./index.html"
              )
            );
          }
        )
      );
      return;
    }
    /* =====================================
       APP FILES
       Сначала кэш для быстрого запуска.
       Параллельно обновляем кэш сетью.
    ===================================== */
    event.respondWith(
      caches
        .match(request)
        .then(
          cachedResponse => {
            const networkFetch =
              fetch(request)
                .then(
                  response => {
                    if(
                      response &&
                      response.ok
                    ){
                      event.waitUntil(
                        caches
                          .open(
                            CACHE_NAME
                          )
                          .then(
                            cache =>
                              cache.put(
                                request,
                                response.clone()
                              )
                          )
                      );
                    }
                    return response;
                  }
                )
                .catch(
                  () => null
                );
            if(cachedResponse){
              return cachedResponse;
            }
            return networkFetch.then(
              response => {
                if(response){
                  return response;
                }
                return new Response(
                  "",
                  {
                    status:503,
                    statusText:
                      "Offline"
                  }
                );
              }
            );
          }
        )
    );
  }
);
/* =========================================
   NOTIFICATION CLICK
========================================= */
self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();
    event.waitUntil(
      clients
        .matchAll({
          type:"window",
          includeUncontrolled:true
        })
        .then(
          clientList => {
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
          }
        )
    );
  }
);
