'use strict';
const CACHE='void-survivor-v4';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
function patch(html){
  const edits=[
    ['#auto{display:none!important}', '<style id="void-update">#auto{display:none!important}</style>'],
    ["autoAim=false,keys={}", "autoAim=true,keys={}"],
    ["{id:'harvest',x:84,y:86,name:'Seelenernte',icon:'🔮',max:8,cost:14,growth:1.9,req:['dash'],desc:'Mehr Seelensplitter im Kampf',effect:l=>'+'+15*l+' % Ertrag'}", "{id:'harvest',x:78,y:59,name:'Seelenernte',icon:'🔮',max:8,cost:30,growth:2.1,req:['dash'],desc:'Chance auf einen zusätzlichen Seelensplitter je Stufe',effect:l=>Math.round(l/8*100)+' % Chance auf +1 Splitter'}"],
    ["chance=Math.min(.48,.12+.018*lv('harvest'));if(!boss&&Math.random()>=chance*(tank?2:1))return;let amount=Math.ceil((boss?12+wave*3:tank?2:1)*(1+.15*lv('harvest'))),count=boss?Math.min(12,amount):tank?2:1;", "chance=.12;if(!boss&&Math.random()>=chance*(tank?2:1))return;let amount=Math.ceil(boss?12+wave*3:tank?2:1),bonus=Math.random()<lv('harvest')/8?1:0;amount+=bonus;let count=boss?Math.min(12,amount):tank?2:1;"],
    ["let boss=e.type==='boss',tank=e.type==='tank'", "let boss=e.type==='boss'||e.type==='rift',tank=e.type==='tank'"],
    ["p.inv=.65;shake=4", "p.inv=.35;shake=4"],
    ["if(wave%4===0&&bossWave!==wave){bossWave=wave;spawn('boss');banner('👑 BOSS-WELLE '+wave);AudioFX.play('boss')}", "if(wave%4===0&&bossWave!==wave){bossWave=wave;spawn('boss');banner('👑 BOSS-WELLE '+wave);AudioFX.play('boss')}if(wave%5===0) {spawn('rift');banner('🌀 RIFT WARDEN · WELLE '+wave);AudioFX.play('boss')}"],
    ["type==='boss'?550:type==='tank'?85", "type==='boss'?550:type==='rift'?900:type==='tank'?85"],
    ["r:type==='boss'?35:type==='tank'?22", "r:type==='boss'||type==='rift'?35:type==='tank'?22"],
    ["speed:type==='boss'?56:type==='tank'?49", "speed:type==='boss'?56:type==='rift'?68:type==='tank'?49"],
    ["if(e.type==='shooter'||e.type==='boss'){e.fireT-=dt;if(e.fireT<=0){let n=e.type==='boss'?12:1;", "if(e.type==='shooter'||e.type==='boss'||e.type==='rift'){e.fireT-=dt;if(e.fireT<=0){let n=e.type==='rift'?16:e.type==='boss'?12:1;"],
    ["let aa=e.type==='boss'?time*.8+i*2*Math.PI/n:a;", "let aa=e.type==='boss'?time*.8+i*2*Math.PI/n:e.type==='rift'?time*1.1+i*2*Math.PI/n:a;"],
    ["e.type==='boss'?165:205", "e.type==='boss'?165:e.type==='rift'?190:205"],
    ["r:e.type==='boss'?6:5,damage:e.type==='boss'?19:13", "r:e.type==='boss'||e.type==='rift'?6:5,damage:e.type==='boss'?19:e.type==='rift'?16:13"],
    ["e.type==='boss'?24:e.type==='tank'?18:10", "e.type==='boss'||e.type==='rift'?24:e.type==='tank'?18:10"],
    ["e.type==='boss'?'#ff4e7f':'#ff829e'", "e.type==='boss'?'#ff4e7f':e.type==='rift'?'#bc7bff':'#ff829e'"],
    ["e.type==='boss'?'BOSS BESIEGT!'", "e.type==='boss'?'BOSS BESIEGT!':e.type==='rift'?'RIFT WARDEN BESIEGT!'"],
    ["e.type==='boss'?'#ff4b77':e.type==='tank'", "e.type==='boss'?'#ff4b77':e.type==='rift'?'#c06cff':e.type==='tank'"],
    ["e.type==='boss'?20:9", "e.type==='boss'||e.type==='rift'?20:9"],
    ["e.type==='boss'?4:e.type==='tank'?4", "e.type==='boss'||e.type==='rift'?4:e.type==='tank'?4"],
    ["e.type==='boss'?8:e.type==='tank'?4", "e.type==='boss'||e.type==='rift'?8:e.type==='tank'?4"],
    ["e.type==='boss'?10:4", "e.type==='boss'||e.type==='rift'?10:4"],
    ["else if(!aimInput.active&&!aimStick.used&&target)", "else if(!aimInput.active&&target)"],
    ["aimStick.active=true;", "aimStick.active=true;autoAim=false;"],
    ["aimStick.active=false;aimStick.x=0;aimStick.y=0;", "aimStick.active=false;aimStick.x=0;aimStick.y=0;autoAim=true;"],
    ["aimInput={...pos,active:true};", "aimInput={...pos,active:true};autoAim=false;"],
    ["aimPointer=null;/* Keep final aim direction until touched again. */", "aimPointer=null;autoAim=true;/* Keep final aim direction until touched again. */"],
    ["aimPointer=null}", "aimPointer=null;autoAim=true}"]
  ];
  for(const [from,to] of edits){if(html.includes(from))html=html.replace(from,to)}
  if(!html.includes('id="void-update"'))html=html.replace('</head>','<style id="void-update">#auto{display:none!important}</style></head>');
  return html;
}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/'){event.respondWith(fetch(request).then(response=>{if(!response.ok)return response;return response.text().then(text=>new Response(patch(text),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)}))}).catch(()=>caches.match('./index.html')));return}event.respondWith(caches.match(request).then(cached=>cached||fetch(request)))});
