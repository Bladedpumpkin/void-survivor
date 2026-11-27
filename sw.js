const CACHE='void-survivor-android-v12';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

function patchGamePage(response){
  return response.text().then(html=>{
    const closeIife=html.lastIndexOf('})();');
    if(closeIife<0)return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});

    // Keep the game's own markup and layout; make only the requested targeted substitutions.
    html=html
      .replace("if(wave%4===0&&bossWave!==wave)","if(wave%5===0&&bossWave!==wave)")
      .replace("p.inv=.65","p.inv=.3")
      .replace("id:'harvest',x:84,y:86,name:'Seelenernte',icon:'🔮',max:8,cost:14,growth:1.9,req:['dash'],desc:'Mehr Seelensplitter im Kampf',effect:l=>'+'+15*l+' % Ertrag'","id:'harvest',x:76,y:78,name:'Seelenernte',icon:'🔮',max:8,cost:30,growth:2.1,req:['dash'],desc:'Chance auf einen zusätzlichen Seelensplitter',effect:l=>Math.round(l/8*100)+' % Extra-Chance'")
      .replace("let W=960,H=540,dpr=1,last=performance.now(),state='menu',scene='arena',clock=0,time=0,wave=1,kills=0,spawnTimer=0,bossWave=0,uid=0,uiTimer=0,notice=0,autoAim=false,keys=", "let W=960,H=540,dpr=1,last=performance.now(),state='menu',scene='arena',clock=0,time=0,wave=1,kills=0,spawnTimer=0,bossWave=0,uid=0,uiTimer=0,notice=0,autoAim=true,keys=");

    const extras=`
// Requested targeted game updates. Existing unrelated game features remain intact.
{
  // Restore the original pause-menu controls directly after the resume button.
  const resumeButton=$('resume');
  if(resumeButton&&!$('bonus-shards')){
    const bonus=document.createElement('button');
    bonus.id='bonus-shards';bonus.type='button';bonus.className='start secondary';bonus.textContent='✦ +100 SEELENSPLITTER';
    resumeButton.insertAdjacentElement('afterend',bonus);
    const waveRow=document.createElement('div');waveRow.className='row';waveRow.style.justifyContent='center';waveRow.style.flexWrap='wrap';
    const label=document.createElement('label');label.htmlFor='wave-select';label.textContent='WELLE';
    const input=document.createElement('input');input.id='wave-select';input.type='number';input.min='1';input.max='999';input.step='1';input.value='5';
    input.style.cssText='width:90px;padding:8px;border-radius:8px;border:1px solid #72c9e5;background:#263855;color:#eaf4ff;font-weight:900;text-align:center';
    const go=document.createElement('button');go.id='go-wave';go.type='button';go.className='start secondary';go.textContent='ZU WELLE';
    waveRow.append(label,input,go);bonus.insertAdjacentElement('afterend',waveRow);
    bonus.addEventListener('click',()=>{if(state!=='pause')return;souls+=100;save();hud();AudioFX.init();AudioFX.play('pickup');banner('+100 SEELENSPLITTER');});
    go.addEventListener('click',()=>{if(state!=='pause')return;const selected=Math.max(1,Math.min(999,Math.floor(Number(input.value)||1)));input.value=String(selected);time=(selected-1)*25;wave=selected;bossWave=0;kills=0;spawnTimer=0;enemies=[];hostile=[];shots=[];drops=[];p.hp=p.maxhp;p.inv=1.2;scene='arena';state='play';resumeState='play';$('pause-panel').style.display='none';releaseControls();banner('WELLE '+selected);save();hud();last=performance.now();});
  }

  // Remove the manual auto-aim toggle; auto aim runs whenever manual aiming is not active.
  if($('auto'))$('auto').style.display='none';
  autoAim=true;
  const aimControl=$('aim-stick');
  if(aimControl){
    aimControl.addEventListener('pointerdown',()=>{autoAim=false;aimStick.used=true;});
    const restoreAutoAim=()=>{autoAim=true;};
    aimControl.addEventListener('pointerup',restoreAutoAim);
    aimControl.addEventListener('pointercancel',restoreAutoAim);
  }
  canvas.addEventListener('pointerdown',event=>{if(state==='play'&&event.pointerType!=='touch')autoAim=false;});
  canvas.addEventListener('pointerup',()=>{autoAim=true;});
  canvas.addEventListener('pointercancel',()=>{autoAim=true;});

  // Make dash work while either mobile stick is held, using the current movement vector.
  const originalDash=dash;
  dash=function(){
    const keyX=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.ArrowLeft));
    const keyY=Number(!!(keys.KeyS||keys.ArrowDown))-Number(!!(keys.KeyW||keys.ArrowUp));
    let moveX=keyX+joy.x,moveY=keyY+joy.y;
    if(Math.hypot(moveX,moveY)<.08){moveX=p.dx;moveY=p.dy;}
    const oldX=joy.x,oldY=joy.y;
    joy.x=moveX-keyX;joy.y=moveY-keyY;
    try{originalDash();}finally{joy.x=oldX;joy.y=oldY;}
  };
  $('dash').addEventListener('pointerdown',event=>{event.preventDefault();AudioFX.init();dash();});

  // Harvest grants a separate, independent chance for exactly one extra shard per defeated enemy.
  const originalDrop=drop;
  drop=function(enemy){
    originalDrop(enemy);
    const chance=Math.min(1,Math.max(0,lv('harvest')/8));
    if(chance>0&&Math.random()<chance){
      drops.push({x:enemy.x,y:enemy.y,r:7,amount:1,phase:rand(0,Math.PI*2),collected:false});
    }
  };

  // Re-enable a Rift Warden on every fifth wave (ordinary wave-four bosses are disabled above).
  let riftPortals=[];
  const originalSpawn=spawn;
  spawn=function(type){
    originalSpawn(type);
    if(type==='boss'){
      const boss=enemies[enemies.length-1];
      if(boss){boss.riftGuardian=true;boss.hp*=2.5;boss.maxhp=boss.hp;boss.riftTimer=1.5;boss.riftShotTimer=.2;boss.riftSide=0;}
    }
  };
  const baseRender=render;
  render=function(){
    baseRender();
    if(!riftPortals.length&&!hostile.some(m=>m.homing&&m.life>0))return;
    ctx.save();
    for(const portal of riftPortals){const pulse=1+Math.sin(clock*8)*.12;ctx.save();ctx.translate(portal.x,portal.y);ctx.rotate(portal.angle);ctx.shadowColor='#9b75ff';ctx.shadowBlur=22;ctx.strokeStyle='#c2a4ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,13*pulse,25*pulse,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#74eaff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,7*pulse,18*pulse,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for(const missile of hostile){if(!missile.homing||missile.life<=0)continue;ctx.save();ctx.translate(missile.x,missile.y);ctx.rotate(Math.atan2(missile.vy,missile.vx));ctx.shadowColor='#d34cff';ctx.shadowBlur=17;ctx.fillStyle='#a83cff';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(1,6);ctx.lineTo(-8,4);ctx.lineTo(-5,0);ctx.lineTo(-8,-4);ctx.lineTo(1,-6);ctx.closePath();ctx.fill();ctx.restore();}
    ctx.restore();
  };
  const bossStyle=document.createElement('style');bossStyle.textContent='#rift-boss-hud{position:fixed;z-index:7;top:max(76px,calc(env(safe-area-inset-top) + 82px));left:50%;transform:translateX(-50%);width:min(54vw,440px);display:none;text-align:center;color:#e9ddff;font-weight:900;text-shadow:0 0 12px #a35bff}#rift-boss-track{height:10px;margin-top:5px;border:1px solid #d5baff;border-radius:9px;background:#21152f;overflow:hidden}#rift-boss-fill{height:100%;width:100%;background:linear-gradient(90deg,#8139d8,#ef65ff);transition:width .12s}';document.head.appendChild(bossStyle);
  const bossHud=document.createElement('div');bossHud.id='rift-boss-hud';bossHud.innerHTML='<div>RIFT WARDEN</div><div id="rift-boss-track"><div id="rift-boss-fill"></div></div>';document.body.appendChild(bossHud);
  let riftLast=performance.now();
  setInterval(()=>{
    const now=performance.now(),dt=Math.min(.1,(now-riftLast)/1000);riftLast=now;
    const boss=enemies.find(enemy=>enemy.riftGuardian&&!enemy.dead);
    if(!boss){riftPortals=[];bossHud.style.display='none';return;}
    bossHud.style.display=state==='play'?'block':'none';
    const fill=$('rift-boss-fill');if(fill)fill.style.width=Math.max(0,Math.min(100,boss.hp/boss.maxhp*100))+'%';
    if(state!=='play')return;
    boss.riftTimer-=dt;
    if(boss.riftTimer<=0){const oldX=boss.x,oldY=boss.y;boss.x=clamp(rand(W*.18,W*.82),30,W-30);boss.y=clamp(rand(H*.18,H*.82),30,H-30);ring(oldX,oldY,'#aa72ff',110,190);burst(oldX,oldY,'#c58cff',12,180);ring(boss.x,boss.y,'#8ef2ff',125,210);burst(boss.x,boss.y,'#d7b4ff',18,220);boss.riftTimer=2.7;const angle=Math.atan2(p.y-boss.y,p.x-boss.x);riftPortals=[-1,1].map((side,index)=>({x:boss.x+Math.cos(angle+side*1.05)*52,y:boss.y+Math.sin(angle+side*1.05)*52,angle:angle+side*.4,index}));boss.riftShotTimer=.2;}
    if(riftPortals.length){boss.riftShotTimer-=dt;if(boss.riftShotTimer<=0){for(let volley=0;volley<2;volley++){const portal=riftPortals[boss.riftSide++%riftPortals.length],aim=Math.atan2(p.y-portal.y,p.x-portal.x)+rand(-.13,.13),speed=340;hostile.push({x:portal.x,y:portal.y,vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r:8,damage:18,life:6,homing:true});}boss.riftShotTimer=.32;}}
    for(const missile of hostile){if(!missile.homing)continue;const aim=Math.atan2(p.y-missile.y,p.x-missile.x),speed=340;missile.vx+=(Math.cos(aim)*speed-missile.vx)*.18;missile.vy+=(Math.sin(aim)*speed-missile.vy)*.18;}
  },50);
}
`;
    html=html.slice(0,closeIife)+extras+html.slice(closeIife);
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    let response=await caches.match(request);
    if(!response){response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone());}}
    const isGamePage=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/';
    return isGamePage?patchGamePage(response):response;
  })());
});
