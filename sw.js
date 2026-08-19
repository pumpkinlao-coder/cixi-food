/* 慈溪味 Service Worker — 缓存优先，支持离线访问 */
var CACHE_NAME = "cixi-cache-v1";

var CORE_ASSETS = [
  "./",
  "./index.html",
  "./cixi-recipes.html",
  "./manifest.webmanifest",
  "./assets/app.js",
  "./assets/features.js",
  "./assets/order.js",
  "./assets/remote.js",
  "./assets/refs.js",
  "./assets/recipes-part1.js",
  "./assets/recipes-part2.js",
  "./assets/recipes-part3.js",
  "./assets/recipes-part4.js",
  "./assets/recipes-part5.js",
  "./assets/recipes-part6.js",
  "./assets/recipes-part7.js",
  "./assets/logo.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./_shared/js/echarts.min.js",
  "./_shared/fonts/CrimsonPro-Regular.ttf",
  "./_shared/fonts/CrimsonPro-Bold.ttf",
  "./_shared/fonts/YoungSerif-Regular.ttf"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") { return; }

  var url = new URL(req.url);
  if (url.origin !== location.origin) { return; }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) { return cached; }
      return fetch(req).then(function (resp) {
        if (resp && resp.status === 200 && (resp.type === "basic" || resp.type === "default")) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone);
          });
        }
        return resp;
      }).catch(function () {
        if (req.mode === "navigate") {
          return caches.match("./cixi-recipes.html");
        }
        return Response.error();
      });
    })
  );
});
