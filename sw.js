const CACHE = 'void-survivor-android-v7';
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

    // Player shots can destroy guardian missiles; a destroyed missile cannot hit the player.
    html = html.replace('shots=shots.filter(b=>b.life>0', `for(let shot of shots){if(shot.life<=0)continue;for(let missile of hostile){if(!missile.homing||missile.life<=0)continue;if(Math.hypot(shot.x-missile.x,shot.y-missile.y)<missile.r+5){missile.life=0;shot.life=0;burst(missile.x,missile.y,'#c38bff',8,130);AudioFX.play('hit');break}}}shots=shots.filter(b=>b.life>0`);

    const riftGuardianCode = `
// Rift Guardian: durable wave-five boss, teleports between attacks and opens fixed rifts.
let riftPortals=[];
const originalSpawn=spawn;
spawn=function(type){
  originalSpawn(type);
  if(type==='boss'){
    const boss=enemies[enemies.length-1];
    if(boss){boss.riftGuardian=true;boss.hp*=2.5;boss.maxhp=boss.hp;boss.riftTimer=1.5;boss.riftShotTimer=0;boss.riftSide=0;}
  }
};
const originalRender=render;
render=function(){
  originalRender();
  if(!riftPortals.length&&!hostile.some(missile=>missile.homing&&missile.life>0))return;
  ctx.save();
  for(const portal of riftPortals){
    const pulse=1+Math.sin(clock*8)*.12;
    ctx.save();ctx.translate(portal.x,portal.y);ctx.rotate(portal.angle);
    ctx.shadowColor='#9b75ff';ctx.shadowBlur=22;
    ctx.strokeStyle='#c2a4ff';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,13*pulse,25*pulse,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#74eaff';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,0,7*pulse,18*pulse,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  // Overlay the default hostile-bullet dot with a distinctive, destroyable rift dart.
  for(const missile of hostile){
    if(!missile.homing||missile.life<=0)continue;
    ctx.save();ctx.translate(missile.x,missile.y);ctx.rotate(Math.atan2(missile.vy,missile.vx));
    ctx.shadowColor='#d34cff';ctx.shadowBlur=17;
    ctx.fillStyle='#a83cff';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(1,6);ctx.lineTo(-8,4);ctx.lineTo(-5,0);ctx.lineTo(-8,-4);ctx.lineTo(1,-6);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e6fbff';ctx.shadowColor='#75f5ff';ctx.shadowBlur=12;
    ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(0,2);ctx.lineTo(-4,0);ctx.lineTo(0,-2);ctx.closePath();ctx.fill();
    ctx.restore();
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
    // Teleport first, then open portals beside the landing point. They stay at these coordinates.
    const oldX=boss.x,oldY=boss.y;
    boss.x=clamp(rand(W*.18,W*.82),30,W-30);
    boss.y=clamp(rand(H*.18,H*.82),30,H-30);
    ring(oldX,oldY,'#aa72ff',110,190);burst(oldX,oldY,'#c58cff',12,180);
    ring(boss.x,boss.y,'#8ef2ff',125,210);burst(boss.x,boss.y,'#d7b4ff',18,220);
    boss.riftTimer=2.7;
    const angle=Math.atan2(p.y-boss.y,p.x-boss.x);
    riftPortals=[-1,1].map((side,index)=>({x:boss.x+Math.cos(angle+side*1.05)*52,y:boss.y+Math.sin(angle+side*1.05)*52,angle:angle+side*.4,index}));
    boss.riftShotTimer=.2;
  }
  if(riftPortals.length){
    boss.riftShotTimer-=.05;
    if(boss.riftShotTimer<=0){
      // Fire paired, fast homing missiles from the fixed portal positions.
      for(let volley=0;volley<2;volley++){
        const portal=riftPortals[boss.riftSide++%riftPortals.length];
        const aim=Math.atan2(p.y-portal.y,p.x-portal.x)+rand(-.13,.13);
        const speed=340;
        hostile.push({x:portal.x,y:portal.y,vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r:8,damage:18,life:6,homing:true});
      }
      boss.riftShotTimer=.32;
    }
  }
  for(const missile of hostile){
    if(!missile.homing)continue;
    const aim=Math.atan2(p.y-missile.y,p.x-missile.x),speed=340;
    missile.vx+=(Math.cos(aim)*speed-missile.vx)*.18;
    missile.vy+=(Math.sin(aim)*speed-missile.vy)*.18;
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
