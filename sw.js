const CACHE = 'void-survivor-android-v5';
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

function addPauseReward(response) {
  return response.text().then(html => {
    const menuButton = '<button id="start" class="start">SPIEL STARTEN</button>';
    const pauseResumeButton = '<button id="resume" class="start">WEITERSPIELEN</button>';
    const pauseRewardButton = '<button id="bonus-shards" class="start secondary">✦ +100 SEELENSPLITTER</button>';
    const pauseHandlerAnchor = "$('pause').onclick=pause;";
    const rewardHandler = "$('bonus-shards').addEventListener('click',()=>{if(state!=='pause')return;souls+=100;save();hud();AudioFX.init();AudioFX.play('pickup');banner('+100 SEELENSPLITTER');});";

    if (!html.includes(menuButton) || !html.includes(pauseResumeButton) || !html.includes(pauseHandlerAnchor)) {
      return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
    }

    const updatedHtml = html
      .replace(menuButton, menuButton)
      .replace(pauseResumeButton, `${pauseResumeButton}${pauseRewardButton}`)
      .replace(pauseHandlerAnchor, `${rewardHandler}${pauseHandlerAnchor}`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers
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
    return isGamePage ? addPauseReward(response) : response;
  })());
});
