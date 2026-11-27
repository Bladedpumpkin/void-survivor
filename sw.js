const CACHE='void-survivor-android-v11';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

function patchGamePage(response){
  return response.text().then(html=>{
    const scriptEnd=html.lastIndexOf('</script>');
    const closureEnd=scriptEnd<0?-1:html.lastIndexOf('})();',scriptEnd);
    if(closureEnd<0){
      return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
    }

    const additions=`
// Pause-menu utilities: add shards and jump to a chosen wave without changing other game systems.
{
  const panel=$('pause-panel');
  const heading=panel&&panel.querySelector('h2');
  if(panel&&heading&&!panel.querySelector('#pause-extras')){
    const extras=document.createElement('div');
    extras.id='pause-extras';
    extras.style.cssText='display:flex;flex-direction:column;gap:10px;width:min(100%,360px);margin:6px auto 12px';

    const shardsButton=document.createElement('button');
    shardsButton.type='button';
    shardsButton.className='start secondary';
    shardsButton.textContent='✦ +100 SEELENSPLITTER';
    shardsButton.addEventListener('click',()=>{
      if(state!=='pause')return;
      souls+=100;
      save();
      hud();
      AudioFX.init();
      AudioFX.play('pickup');
      banner('+100 SEELENSPLITTER');
    });

    const waveRow=document.createElement('div');
    waveRow.style.cssText='display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px';
    const waveLabel=document.createElement('label');
    waveLabel.htmlFor='pause-wave-select';
    waveLabel.textContent='WELLE';
    const waveInput=document.createElement('input');
    waveInput.id='pause-wave-select';
    waveInput.type='number';
    waveInput.min='1';
    waveInput.max='999';
    waveInput.step='1';
    waveInput.value=String(wave);
    waveInput.setAttribute('aria-label','Zielwelle');
    waveInput.style.cssText='width:84px;padding:8px;border-radius:8px;border:1px solid #72c9e5;background:#263855;color:#eaf4ff;font-weight:900;text-align:center';
    const waveButton=document.createElement('button');
    waveButton.type='button';
    waveButton.className='start secondary';
    waveButton.textContent='ZU WELLE';
    waveButton.addEventListener('click',()=>{
      if(state!=='pause')return;
      const selected=Math.max(1,Math.min(999,Math.floor(Number(waveInput.value)||1)));
      waveInput.value=String(selected);
      time=(selected-1)*25;
      wave=selected;
      bossWave=0;
      kills=0;
      spawnTimer=0;
      enemies=[];
      hostile=[];
      shots=[];
      drops=[];
      p.hp=p.maxhp;
      p.inv=1.2;
      scene='arena';
      state='play';
      resumeState='play';
      panel.style.display='none';
      releaseControls();
      banner('WELLE '+selected);
      save();
      hud();
      last=performance.now();
    });
    waveRow.append(waveLabel,waveInput,waveButton);
    extras.append(shardsButton,waveRow);
    heading.insertAdjacentElement('afterend',extras);
  }
}
`;

    html=html.slice(0,closureEnd)+additions+html.slice(closureEnd);
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
