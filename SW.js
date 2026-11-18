"use strict";

const CACHE_NAME = "miyar-results-v1";
const BOOTSTRAP_URL =
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css";

const APP_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);

    try {
      const response = await fetch(BOOTSTRAP_URL, { mode: "cors" });

      if (response.ok || response.type === "opaque") {
        await cache.put(BOOTSTRAP_URL, response);
      }
    } catch {
      // يظل تثبيت ملفات التطبيق ممكنًا لو تعذر تحميل Bootstrap.
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames
        .filter(
          (cacheName) =>
            cacheName.startsWith("miyar-results-") &&
            cacheName !== CACHE_NAME
        )
        .map((cacheName) => caches.delete(cacheName))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (requestUrl.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }

          return response;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match(
              new URL("./index.html", self.registration.scope).href
            ))
          );
        }
      })());

      return;
    }

    event.respondWith((async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }

        return response;
      } catch {
        return caches.match(
          new URL("./index.html", self.registration.scope).href
        );
      }
    })());

    return;
  }

  if (requestUrl.href === BOOTSTRAP_URL) {
    event.respondWith((async () => {
      const cachedResponse = await caches.match(BOOTSTRAP_URL);
      if (cachedResponse) return cachedResponse;

      return fetch(request);
    })());
  }
});