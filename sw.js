/* Aurum — service worker.
   Objectif : l'app reste ouvrable hors connexion une fois installée.
   Aucune donnée n'est transmise : on ne fait que mettre en cache les fichiers
   statiques de l'app (le payload est de toute façon chiffré).

   Stratégie :
   - navigation / index.html  -> réseau d'abord, cache en secours.
     Ainsi, quand tu réuploades un index.html re-chiffré, tu vois la nouvelle
     version dès le prochain lancement en ligne (pas de version fantôme).
   - icônes / manifest        -> cache d'abord (ils ne changent jamais).
*/
const CACHE = "aurum-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate" || req.destination === "document";

  if (isDoc) {
    // Réseau d'abord : la dernière version l'emporte quand on est en ligne.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Cache d'abord pour les fichiers statiques.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
