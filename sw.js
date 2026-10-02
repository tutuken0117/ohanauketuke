/* 御花受付：オフライン起動用のサービスワーカー
   電波があれば常に最新を取りに行き、取れたものを控えておく。
   電波がなければ控え（キャッシュ）から開く。登録データは localStorage 側にあり、ここでは扱わない。 */
const CACHE = "ohana-v2";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    /* no-cache：ブラウザが手元に持っている古い写し（最大10分）を使わず、毎回サーバーに最新か確かめる */
    fetch(req.url, {cache:"no-cache"}).then(function(res){
      if (res && res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(req, {ignoreSearch:true}).then(function(hit){ return hit || caches.match("index.html"); });
    })
  );
});
