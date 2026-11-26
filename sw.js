const CACHE = 'void-survivor-android-v6';
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

function patchGamePage(response) {
  return response.text().then(html => {
    const menuButton = '<button id="start" class="start">SPIEL STARTEN</button>';
    const pauseResumeButton = '<button id="resume" class="start">WEITERSPIELEN</button>';
    const pauseRewardButton = '<button id="bonus-shards" class="start secondary">✦ +100 SEELENSPLITTER</button>';
    const pauseHandlerAnchor = "$('pause').onclick=pause;";

    if (!html.includes(menuButton) || !html.includes(pauseResumeButton) || !html.includes(pauseHandlerAnchor)) {
      return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
    }

    html = html
      .replace(pauseResumeButton, `${pauseResumeButton}${pauseRewardButton}`)
      .replace(pauseHandlerAnchor, "$('bonus-shards').addEventListener('click',()=>{if(state!=='pause')return;souls+=100;save();hud();AudioFX.init();AudioFX.play('pickup');banner('+100 SEELENSPLITTER');});" + pauseHandlerAnchor)
      .replace('if(wave%4===0&&bossWave!==wave){', 'if(wave===5&&bossWave!==wave){')
      .replace("if(e.type==='shooter'||e.type==='boss'){", "if(e.type==='shooter'||(e.type==='boss'&&!e.riftGuardian)){" );

    const riftGuardianCode = `
// Rift Guardian: one encounter at wave 5, with paired rifts and homing missiles.
let riftPortals=[];
const originalSpawn=spawn;
spawn=function(type){
  originalSpawn(type);
  if(type==='boss'){
    const boss=enemies[enemies.length-1];
    if(boss){boss.riftGuardian=true;boss.riftTimer=1.5;boss.riftShotTimer=0;boss.riftSide=0;}
  }
};
const originalRender=render;
render=function(){
  originalRender();
  if(!riftPortals.length)return;
  ctx.save();
  for(const portal of riftPortals){
    const pulse=1+Math.sin(clock*8)*.12;
    ctx.translate(portal.x,portal.y);
    ctx.shadowColor='#9b75ff';ctx.shadowBlur=22;
    ctx.strokeStyle='#c2a4ff';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,13*pulse,25*pulse,portal.angle,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#74eaff';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,0,7*pulse,18*pulse,-portal.angle,0,Math.PI*2);ctx.stroke();
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  ctx.restore();
};
const riftStyle=document.createElement('style');
riftStyle.textContent='#rift-boss-hud{position:fixed;z-index:7;top:max(76px,calc(env(safe-area-inset-top) + 82px));left:50%;transform:translateX(-50%);width:min(54vw,440px);display:none;text-align:center;pointer-events:none;font:900 11px system-ui,sans-serif;letter-spacing:1.5px;color:#e6d9ff;text-shadow:0 0 9px #a06cff}#rift-boss-track{height:10px;margin-top:5px;border:1px solid #bd9cff;border-radius:8px;background:#171226;overflow:hidden;box-shadow:0 0 15px #8e5cff66}#rift-boss-fill{height:100%;width:100%;background:linear-gradient(90deg,#8039d8,#e084ff);transition:width .12s linear}';
document.head.appendChild(riftStyle);
const bossHud=document.createElement('div');bossHud.id='rift-boss-hud';bossHud.innerHTML='<div>RIFT GUARDIAN</div><div id="rift-boss-track"><div id="rift-boss-fill"></div></div>';
document.body.appendChild(bossHud);
setInterval(()=>{
  const boss=enemies.find(enemy=>enemy.riftGuardian&&!enemy.dead);
  if(!boss){riftPortals=[];bossHud.style.display='none';return;}
  bossHud.style.display=state==='play'?'block':'none';
  const fill=document.getElementById('rift-boss-fill');
  if(fill)fill.style.width=Math.max(0,Math.min(100,boss.hp/boss.maxhp*100))+'%';
  if(state!=='play')return;
  boss.riftTimer-=.05;
  if(boss.riftTimer<=0){
    boss.riftTimer=2.7;
    const angle=Math.atan2(p.y-boss.y,p.x-boss.x);
    riftPortals=[-1,1].map((side,index)=>({x:boss.x+Math.cos(angle+side*1.05)*52,y:boss.y+Math.sin(angle+side*1.05)*52,angle:angle+side*.4,index}));
    boss.riftShotTimer=.35;
  }
  if(riftPortals.length){
    const angle=Math.atan2(p.y-boss.y,p.x-boss.x);
    riftPortals.forEach((portal,index)=>{const side=index===0?-1:1;portal.x=boss.x+Math.cos(angle+side*1.05)*52;portal.y=boss.y+Math.sin(angle+side*1.05)*52;portal.angle=angle+side*.4;});
    boss.riftShotTimer-=.05;
    if(boss.riftShotTimer<=0){
      const portal=riftPortals[boss.riftSide++%riftPortals.length];
      const aim=Math.atan2(p.y-portal.y,p.x-portal.x);
      hostile.push({x:portal.x,y:portal.y,vx:Math.cos(aim)*210,vy:Math.sin(aim)*210,r:7,damage:18,life:7,homing:true});
      boss.riftShotTimer=.55;
    }
  }
  for(const missile of hostile){
    if(!missile.homing)continue;
    const aim=Math.atan2(p.y-missile.y,p.x-missile.x),speed=260;
    missile.vx+=(Math.cos(aim)*speed-missile.vx)*.12;
    missile.vy+=(Math.sin(aim)*speed-missile.vy)*.12;
  }
},50);
`;

    html = html.replace(/\}\)\(\);\s*<\/script>/, `${riftGuardianCode}\n})();</script>`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
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
    return isGamePage ? patchGamePage(response) : response;
  })());
});
