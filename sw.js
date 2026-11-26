const CACHE = 'void-survivor-android-v4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function addMenuReward(response) {
  return response.text().then(html => {
    const startButton = '<button id="start" class="start">SPIEL STARTEN</button>';
    const rewardButton = '<button id="bonus-shards" class="start" style="margin-top:10px;padding:10px 18px;font-size:13px;background:#39245d;border-color:#c49cff;box-shadow:0 0 18px #b280ff33">✦ +100 SEELENSPLITTER</button>';
    const originalStartHandler = "$('start').addEventListener('click',()=>{";
    const rewardHandler = "$('bonus-shards').addEventListener('click',()=>{souls+=100;save();hud();AudioFX.init();AudioFX.play('pickup');$('bonus-shards').textContent='✦ 100 SPLITTER ERHALTEN!';});";

    if (!html.includes(startButton) || !html.includes(originalStartHandler)) {
      return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
    }

    const updatedHtml = html
      .replace(startButton, `${startButton}${rewardButton}`)
      .replace(originalStartHandler, `${rewardHandler}${originalStartHandler}`);

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    let response = await caches.match(request);
    if (!response) {
      response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
    }

    const isGamePage = request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/';
    return isGamePage ? addMenuReward(response) : response;
  })());
});
