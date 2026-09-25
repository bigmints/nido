/* Nido service worker: minimal offline support for the static shell.
 *  - same-origin GET only; third-party calls (Open-Meteo, AI endpoints) are never cached
 *  - /_next/static/* and icons: cache-first (files are content-hashed)
 *  - pages and everything else: network-first with cache fallback, so updates arrive fast
 *    and the app still opens offline after the first visit
 */
const VERSION = "nido-v1";
const SCOPE = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        cache
          .addAll([SCOPE, SCOPE + "cocina/", SCOPE + "armario/", SCOPE + "ajustes/"])
          .catch(() => {}),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const immutable = url.pathname.includes("/_next/static/") || url.pathname.includes("/icons/");
  if (immutable) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === "navigate" ? caches.match(SCOPE) : Response.error())),
      ),
  );
});
