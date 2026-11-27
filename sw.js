const CACHE='void-survivor-android-v13';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

function patchGamePage(response){
  return response.text().then(html=>{
    // Fix only the injected start-button listener by restoring the exact original HTML markup.
    const oldStart='$(\'start\').addEventListener(\'click\',()=>{AudioFX.init();AudioFX.play(\'rebirth\');startRun();ring(p.x,p.y,\'#94eaff\',230);burst(p.x,p.y,\'#9af0ff\',35);try{screen.orientation?.lock?.(\'landscape\').catch(()=>{})}catch(e){}});';
    if(html.includes(oldStart)){
      html=html.replace(oldStart,oldStart);
    }

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
