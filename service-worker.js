const CACHE_NAME = "vector-break-shell-v8";
const LEGACY_CACHE_NAME = "vector-break-legacy-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./themes.js",
  "./bricks.js",
  "./collisions.js",
  "./tetrominoes.js",
  "./mechanics.js",
  "./modes.js",
  "./corruption.js",
  "./ui.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./legacy/index.html",
  "./legacy/styles.css",
  "./legacy/game.js",
  "./legacy/bricks.js",
  "./legacy/collisions.js"
];

function getCacheNameForUrl(url) {
  return url.pathname.includes("/legacy/") ? LEGACY_CACHE_NAME : CACHE_NAME;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => caches.open(LEGACY_CACHE_NAME))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== LEGACY_CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  const requestUrl = new URL(event.request.url);
  const cacheName = getCacheNameForUrl(requestUrl);

  if (event.request.mode === "navigate") {
    const cacheKey = requestUrl.pathname.includes("/legacy/") ? "./legacy/index.html" : "./index.html";
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(cacheName).then((cache) => cache.put(cacheKey, copy));
          }
          return response;
        })
        .catch(() => caches.match(cacheKey).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
