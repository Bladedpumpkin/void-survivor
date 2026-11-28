'use strict';
const CACHE='void-survivor-v7';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
function patch(html){
  html=html.replace('<style>','<style>');
  if(!html.includes('#pause-souls')){
    html=html.replace('</style>',`#pause-souls,#pause-wave{min-width:min(80vw,265px);padding:10px 19px;font-size:15px;font-weight:900;border-radius:10px;border:1px solid #72cfe6;background:linear-gradient(135deg,#2767a2,#1f4f86);color:#dff7ff;box-shadow:0 0 22px #4acfff33}#pause-souls:active,#pause-wave:active{transform:scale(.98)}
</style>`);
  }
  html=html.replace('<button id="pause-reset"','<div class="row"><button id="pause-souls" class="secondary">+100 SEELEN</button><button id="pause-wave" class="secondary">WELLE WÄHLEN</button></div><button id="pause-reset"');
  const debug="const pauseSouls=$('pause-souls'),pauseWave=$('pause-wave');if(pauseSouls)pauseSouls.onclick=()=>{souls+=100;save();hud();banner('+100 SEELEN')};if(pauseWave)pauseWave.onclick=()=>{let value=Number(prompt('Welle auswählen (1–100):',String(wave)));if(Number.isInteger(value)&&value>=1&&value<=100){time=(value-1)*25;wave=value-1;bossWave=0;banner('WELLE '+value);hud()}};";
  if(!html.includes("pauseSouls=$('pause-souls')"))html=html.replace("$('pause').onclick=pause;$('resume').onclick=pause;", "$('pause').onclick=pause;$('resume').onclick=pause;"+debug);
  return html;
}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/'){event.respondWith(fetch(request).then(response=>{if(!response.ok)return response;return response.text().then(text=>new Response(patch(text),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)}))}).catch(()=>caches.match('./index.html').then(response=>response||Response.error())));return}event.respondWith(caches.match(request).then(cached=>cached||fetch(request)))});
