// 音読台 の最小限のオフライン対応。
// アプリ本体（HTML・manifest・アイコン）だけをキャッシュする。
// 保存済み原稿・設定はもともとlocalStorageにあるので、ここでは扱わない。
// Web Speech API（読み上げ本体）はオフラインでは端末によって使えない場合があるため、
// その場合はondokudai.html側で案内メッセージを表示する（ここでは何もしない）。

var CACHE_VERSION = 'ondokudai-v1';
var CORE_ASSETS = [
  './ondokudai.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return; // POST等はService Workerを介さずそのまま
  if (new URL(request.url).origin !== self.location.origin) return; // Googleフォント等の外部リソースは素通し

  // オンライン時は常に最新を取りに行き、取れたらキャッシュを更新する。
  // 取れなかった（オフラインの）ときだけ、キャッシュ済みの内容で応答する。
  event.respondWith(
    fetch(request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./ondokudai.html');
        });
      })
  );
});
