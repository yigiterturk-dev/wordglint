/* WordSpark service worker — offline-first (works with no connection at all) */
const CACHE = "wordspark-v3"; // v3: varsayılan İngilizce, yavaş tempolu flash, paket tekrarları temizlendi
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./packs/core.json",
  "./packs/academic.json",
  "./packs/exam.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  // Cache-first; ağ varsa arka planda tazele (fontlar dahil)
  e.respondWith(
    caches.match(request).then((cached) => {
      const net = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
