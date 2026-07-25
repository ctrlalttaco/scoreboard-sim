const CACHE_VERSION = "legacy-scoreboard-trainer-v2";
const STATIC_SHELL = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

const cacheResponse = async (cache, request, response) => {
  if (response.ok && response.type !== "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
};

const cacheRenderedShell = async () => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(STATIC_SHELL);
  const response = await fetch("/", { cache: "reload" });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    throw new Error("Unable to cache the application shell.");
  }

  await cache.put("/", response.clone());
  const html = await response.text();
  const assetPaths = Array.from(
    html.matchAll(/(?:src|href)="(\/[^"]+)"/g),
    (match) => match[1],
  ).filter(
    (path) =>
      path.startsWith("/_next/") ||
      path.startsWith("/assets/") ||
      /\.(?:css|js|woff2?)$/.test(path),
  );

  await Promise.all(
    [...new Set(assetPaths)].map(async (path) => {
      const asset = await fetch(path, { cache: "reload" });
      await cacheResponse(cache, path, asset);
    }),
  );
};

self.addEventListener("install", (event) => {
  event.waitUntil(cacheRenderedShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("text/html")
          ) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put("/", response.clone());
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/assets/") ||
    STATIC_SHELL.includes(url.pathname);
  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }
      const response = await fetch(event.request);
      const cache = await caches.open(CACHE_VERSION);
      return cacheResponse(cache, event.request, response);
    }),
  );
});
