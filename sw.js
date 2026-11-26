const CACHE='void-survivor-android-v9';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

function patchGamePage(response){
  return response.text().then(html=>{
    const pauseResumeButton='<button id="resume" class="start">WEITERSPIELEN</button>';
    const pauseRewardButton='<button id="bonus-shards" class="start secondary">✦ +100 SEELENSPLITTER</button>';
    const pauseHandlerAnchor="$('pause').onclick=pause;";

    if(!html.includes(pauseResumeButton)||!html.includes(pauseHandlerAnchor)){
      return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
    }

    const waveControls='<div class="row" style="justify-content:center;flex-wrap:wrap"><label for="wave-select">WELLE</label><input id="wave-select" type="number" min="1" max="999" value="5" style="width:90px;padding:8px;border-radius:8px;border:1px solid #72c9e5;background:#263855;color:#eaf4ff;font-weight:900;text-align:center"><button id="go-wave" class="start secondary">ZU WELLE</button></div>';
    const handlers="$('bonus-shards').addEventListener('click',()=>{if(state!=='pause')return;souls+=100;save();hud();AudioFX.init();AudioFX.play('pickup');banner('+100 SEELENSPLITTER');});$('go-wave').addEventListener('click',()=>{if(state!=='pause')return;const input=$('wave-select');const selected=Math.max(1,Math.min(999,Math.floor(Number(input.value)||1)));input.value=selected;time=(selected-1)*25;wave=selected;bossWave=selected>=5&&selected%5===0?selected-5:0;spawnTimer=0;kills=0;enemies=[];hostile=[];shots=[];drops=[];p.hp=p.maxhp;p.inv=1.2;scene='arena';state='play';resumeState='play';$('pause-panel').style.display='none';releaseControls();banner('WELLE '+selected);save();hud();last=performance.now();});"+pauseHandlerAnchor;

    html=html.replace(pauseResumeButton,pauseResumeButton+pauseRewardButton+waveControls).replace(pauseHandlerAnchor,handlers);
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    let response=await caches.match(request);
    if(!response){
      response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone());}
    }
    const isGamePage=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/';
    return isGamePage?patchGamePage(response):response;
  })());
});
