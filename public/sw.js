// Cache version — injected at build time by next.config.js via a query param
// Falls back to timestamp so dev always gets fresh content
const BUILD_ID = self.location.search
  ? new URLSearchParams(self.location.search).get("v") || "dev"
  : "dev";

const CACHE = `workout-buddy-${BUILD_ID}`;

const PRECACHE = ["/", "/dashboard", "/login", "/offline"];

// ── Install: cache shell pages ────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {})
    )
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete ALL old caches, then notify clients ─────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => {
        // Tell every open tab that a new version is active
        self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: "APP_UPDATED", version: BUILD_ID })
          );
        });
        return self.clients.claim();
      })
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never cache: Supabase, API routes, Next.js internals, auth
  if (
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/setup")
  ) {
    return; // let browser handle normally
  }

  // Navigation: network-first so users always get fresh pages
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
    )
  );
});
