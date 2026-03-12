// ── DOCK ENTRY / EXIT ────────────────────────────────────────────────────────

function dockShip(){
  const dockDist=Math.sqrt(dist2(player,station));
  const planetDist=Math.sqrt(dist2(player,planet));
  if(dockDist<=130 && !stationHostile){ state.dockedAt="station"; enterDock(); }
  else if(dockDist<=130 && stationHostile){ showToast("🚫 Hostile station — cannot dock!"); }
  else if(planetDist<=planet.r+60){ state.dockedAt="planet"; enterDock(); }
}

function enterDock(){
  player.vx=0; player.vy=0;
  player.shield=player.maxShield;
  document.getElementById("ui").classList.add("docked");
  document.getElementById("stationscreen").classList.add("active");
  hubOpen(null);
  saveCurrentPilot("dock");
}

function enterStation(){ state.dockedAt="station"; enterDock(); }

function launchShip(){
  document.getElementById("stationscreen").classList.remove("active");
  document.getElementById("ui").classList.remove("docked");
  state.dockedAt=null;
}

// ── HUB MAIN SCREEN ──────────────────────────────────────────────────────────

let _currentPanel = null;

function hubOpen(panel){
  _currentPanel = panel;
  const sys = SYSTEMS[systemKey];
  const isPlanet = state.dockedAt === "planet";
  const factionColor = FACTION_COLORS[sys.faction] || "#4a9eff";

  const locName = isPlanet
    ? (planet.name || sys.name).toUpperCase() + " — PLANETARY SURFACE"
    : sys.name.toUpperCase() + " STATION";
  document.getElementById("hub-location").textContent = locName;
  document.getElementById("hub-faction").textContent = sys.faction.toUpperCase() + " SPACE  ·  " + sys.desc;
  document.getElementById("hub-faction").style.color = factionColor;
  document.getElementById("hub-credits").textContent = state.credits.toLocaleString() + " Cr";

  const hullPct = Math.round(player.hull/player.maxHull*100);
  document.getElementById("hub-hull-val").textContent = Math.ceil(player.hull) + "/" + player.maxHull;
  document.getElementById("hub-hull-bar").style.width = hullPct+"%";
  document.getElementById("hub-hull-bar").style.background =
    hullPct>60?"#4aff9a":hullPct>30?"#ffcc44":"#ff4444";

  // Show/hide panels
  ["hangar","trading","missions","shipyard"].forEach(p=>{
    document.getElementById("hub-panel-"+p).style.display = panel===p ? "flex" : "none";
  });
  document.getElementById("hub-main").style.display = panel ? "none" : "flex";

  // Nav button highlights
  document.querySelectorAll(".hub-nav-btn").forEach(b=>b.classList.remove("active"));
  if(panel){
    const btn=document.getElementById("hub-nav-"+panel);
    if(btn) btn.classList.add("active");
    if(panel==="hangar") renderHangar();
    if(panel==="missions") renderMissions();
    if(panel==="trading") renderTrading();
    if(panel==="shipyard") renderShipyard();
  }
}

// ── HANGAR ───────────────────────────────────────────────────────────────────

let _hangarTab = "cargo";

function renderHangar(){
  document.getElementById("hangar-tab-cargo").classList.toggle("active", _hangarTab==="cargo");
  document.getElementById("hangar-tab-mods").classList.toggle("active", _hangarTab==="mods");
  document.getElementById("hangar-cargo-panel").style.display = _hangarTab==="cargo"?"block":"none";
  document.getElementById("hangar-mods-panel").style.display = _hangarTab==="mods"?"flex":"none";
  if(_hangarTab==="cargo") renderCargo();
  if(_hangarTab==="mods") renderMods();
}

function switchHangarTab(tab){
  _hangarTab=tab;
  renderHangar();
}

// ── CARGO BAY ────────────────────────────────────────────────────────────────

function renderCargo(){
  const el=document.getElementById("cargo-content");
  const cargo=state.cargo||{};
  const entries=Object.entries(cargo).filter(([,qty])=>qty>0);
  const isPlanet=state.dockedAt==="planet";
  const cost1=isPlanet?80:50, cost2=isPlanet?280:200;

  let html=`
    <div class="cargo-ship-status">
      <div class="cargo-stat"><span class="cs-label">SHIP</span><span class="cs-val">${player.shipType||"Shuttle"}</span></div>
      <div class="cargo-stat"><span class="cs-label">HULL</span><span class="cs-val">${Math.ceil(player.hull)}/${player.maxHull}</span></div>
      <div class="cargo-stat"><span class="cs-label">SHIELD</span><span class="cs-val">${Math.ceil(player.shield)}/${player.maxShield}</span></div>
      <div class="cargo-stat"><span class="cs-label">FUEL</span><span class="cs-val">${state.fuel}/${state.maxFuel}</span></div>
      <div class="cargo-stat"><span class="cs-label">KILLS</span><span class="cs-val">${state.kills||0}</span></div>
    </div>
    <div class="cargo-repair-row">
      <button class="hub-action-btn" id="cargo-rep-small" ${state.credits<cost1||player.hull>=player.maxHull?"disabled":""} onclick="doRepair('small')">⚙ REPAIR +30 HULL — ${cost1} Cr</button>
      <button class="hub-action-btn" id="cargo-rep-full" ${state.credits<cost2||player.hull>=player.maxHull?"disabled":""} onclick="doRepair('full')">⚙ FULL REPAIR — ${cost2} Cr</button>
    </div>
    <div class="cargo-section-title">CARGO HOLD</div>
  `;

  if(entries.length===0){
    html+=`<div class="cargo-empty">Cargo hold is empty.</div>`;
  } else {
    html+=`<div class="cargo-grid">`;
    entries.forEach(([name,qty])=>{
      html+=`<div class="cargo-item"><span class="ci-name">${name}</span><span class="ci-qty">×${qty}</span></div>`;
    });
    html+=`</div>`;
  }

  const storedHere=(state.storedShips||[]).filter(s=>s.locationKey===systemKey);
  html+=`<div class="cargo-section-title" style="margin-top:20px">STORED SHIPS — ${SYSTEMS[systemKey].name.toUpperCase()}</div>`;
  if(storedHere.length===0){
    html+=`<div class="cargo-empty">No ships stored at this location.</div>`;
  } else {
    storedHere.forEach((s,i)=>{
      html+=`
        <div class="stored-ship-row">
          <div class="ss-info">
            <span class="ss-name">${s.shipType}</span>
            <span class="ss-stats">Hull ${s.hull}/${s.maxHull} · Shield ${s.maxShield}</span>
          </div>
          <button class="hub-action-btn" onclick="swapToStoredShip(${i})">⇄ BOARD SHIP</button>
        </div>`;
    });
  }

  el.innerHTML=html;
}

function doRepair(type){
  const isPlanet=state.dockedAt==="planet";
  const cost1=isPlanet?80:50, cost2=isPlanet?280:200;
  if(type==="small"&&state.credits>=cost1&&player.hull<player.maxHull){
    state.credits-=cost1; player.hull=Math.min(player.maxHull,player.hull+30);
  } else if(type==="full"&&state.credits>=cost2&&player.hull<player.maxHull){
    state.credits-=cost2; player.hull=player.maxHull;
  }
  renderCargo();
  document.getElementById("hub-credits").textContent=state.credits.toLocaleString()+" Cr";
}

function swapToStoredShip(idx){
  const storedHere=(state.storedShips||[]).filter(s=>s.locationKey===systemKey);
  const target=storedHere[idx];
  if(!target) return;
  const currentData={
    shipType:player.shipType, hull:player.hull, maxHull:player.maxHull,
    shield:player.shield, maxShield:player.maxShield,
    speed:player.speed, thrust:player.thrust, turnRate:player.turnRate,
    damage:player.damage, mods:player.mods||{}, locationKey:systemKey,
  };
  state.storedShips=(state.storedShips||[]).filter(s=>s!==target);
  state.storedShips.push(currentData);
  const st=SHIP_TYPES[target.shipType]||SHIP_TYPES["Shuttle"];
  player.shipType=target.shipType; player.maxHull=target.maxHull; player.hull=target.hull;
  player.maxShield=target.maxShield; player.shield=target.shield;
  player.speed=target.speed||st.speed; player.thrust=target.thrust||st.thrust;
  player.turnRate=target.turnRate||st.turnRate; player.damage=target.damage||st.damage;
  player.mods=target.mods||{};
  showToast("⇄ Boarded "+target.shipType);
  renderCargo();
}

// ── MODIFICATIONS ────────────────────────────────────────────────────────────

const MOD_SLOTS=[
  {id:"cockpit",        label:"COCKPIT",        side:"left",  desc:"Pilot systems & sensor suite. Affects targeting and situational awareness."},
  {id:"left_weapon",    label:"LEFT WEAPON",    side:"left",  desc:"Port-side weapon hardpoint. Equip cannons, missile launchers or energy weapons."},
  {id:"scanner",        label:"SCANNER",        side:"left",  desc:"Long-range detection array. Reveals enemy signatures at greater distance."},
  {id:"engines",        label:"ENGINES",        side:"left",  desc:"Primary propulsion system. Improves top speed and thrust output."},
  {id:"forward_weapon", label:"FORWARD WEAPON", side:"right", desc:"Nose-mounted weapon hardpoint. High-accuracy forward-firing cannon."},
  {id:"right_weapon",   label:"RIGHT WEAPON",   side:"right", desc:"Starboard weapon hardpoint. Mirror configuration to port side."},
  {id:"shields",        label:"SHIELDS",        side:"right", desc:"Deflector shield array. Increases max shield capacity and recharge rate."},
  {id:"afterburner",    label:"AFTERBURNER",    side:"right", desc:"Emergency boost system. Enables burst speed at the cost of fuel."},
];

function renderMods(){
  const mods=player.mods||{};
  const leftSlots=MOD_SLOTS.filter(s=>s.side==="left");
  const rightSlots=MOD_SLOTS.filter(s=>s.side==="right");

  const makeSlot=(slot)=>{
    const mod=mods[slot.id];
    const filled=mod&&mod.name;
    return `<div class="mod-slot${filled?" filled":""}" onclick="selectModSlot('${slot.id}')" id="modslot-${slot.id}">
      <div class="mod-slot-label">${slot.label}</div>
      <div class="mod-slot-inner">${filled
        ?`<div class="mod-installed"><div class="mod-name">${mod.name}</div></div>`
        :`<div class="mod-empty-icon">+</div>`}
      </div>
    </div>`;
  };

  let exoticHTML="";
  for(let i=0;i<4;i++){
    exoticHTML+=makeSlot({id:`exotic_${i}`,label:`EXOTIC ${i+1}`,side:"exotic",desc:"Exotic module slot. Houses rare and unique ship enhancement modules."});
  }

  const hullPct=Math.round(player.hull/player.maxHull*100);
  const shdPct=player.maxShield>0?Math.round(player.shield/player.maxShield*100):0;
  const spdPct=Math.round(Math.min(player.speed/5,1)*100);

  document.getElementById("hangar-mods-panel").innerHTML=`
    <div class="mods-layout">
      <div class="mods-col mods-col-left">${leftSlots.map(makeSlot).join("")}</div>
      <div class="mods-center">
        <div class="mods-ship-display">
          <canvas id="mods-ship-canvas" width="200" height="200"></canvas>
        </div>
        <div class="mods-ship-name">${player.shipType||"Shuttle"}</div>
        <div class="mods-ship-stats">
          <div class="mss-row"><span class="mss-label">HULL</span><div class="mss-bar-wrap"><div class="mss-bar" style="width:${hullPct}%;background:#4aff9a"></div></div><span class="mss-num">${Math.ceil(player.hull)}/${player.maxHull}</span></div>
          <div class="mss-row"><span class="mss-label">SHIELD</span><div class="mss-bar-wrap"><div class="mss-bar" style="width:${shdPct}%;background:#4a9eff"></div></div><span class="mss-num">${Math.ceil(player.shield)}/${player.maxShield}</span></div>
          <div class="mss-row"><span class="mss-label">SPEED</span><div class="mss-bar-wrap"><div class="mss-bar" style="width:${spdPct}%;background:#ffcc44"></div></div><span class="mss-num">${player.speed.toFixed(1)}</span></div>
        </div>
      </div>
      <div class="mods-col mods-col-right">${rightSlots.map(makeSlot).join("")}</div>
    </div>
    <div class="mods-exotic-row">
      <div class="mods-exotic-label">EXOTIC MODULES</div>
      <div class="mods-exotic-slots">${exoticHTML}</div>
    </div>
    <div class="mods-detail-panel" id="mods-detail">
      <span style="color:#3a5070;font-size:12px">Select a module slot to view details.</span>
    </div>
  `;

  drawModsShip();
}

function selectModSlot(slotId){
  document.querySelectorAll(".mod-slot").forEach(el=>el.classList.remove("selected"));
  const el=document.getElementById("modslot-"+slotId);
  if(el) el.classList.add("selected");
  const slot=MOD_SLOTS.find(s=>s.id===slotId)||{label:slotId.toUpperCase(),desc:"Exotic module slot."};
  const mod=(player.mods||{})[slotId];
  const detail=document.getElementById("mods-detail");
  if(mod&&mod.name){
    const stats=Object.entries(mod.stats||{}).map(([k,v])=>`<span class="mod-stat-chip">${k.toUpperCase()} ${v>0?"+":""}${v}</span>`).join("");
    detail.innerHTML=`
      <div class="detail-slot-name">${slot.label||slotId.toUpperCase()}</div>
      <div class="detail-mod-name">${mod.name}</div>
      <div class="detail-mod-desc">${mod.desc||slot.desc||""}</div>
      <div class="detail-mod-stats">${stats}</div>
      <button class="hub-action-btn danger" onclick="removeModFromSlot('${slotId}')">✕ REMOVE MODULE</button>`;
  } else {
    detail.innerHTML=`
      <div class="detail-slot-name">${slot.label||slotId.toUpperCase()}</div>
      <div class="detail-mod-desc">${slot.desc||"Exotic module slot."}</div>
      <div style="color:#3a5070;font-size:11px;margin-top:10px">No module installed. Visit a Shipyard to purchase modules.</div>`;
  }
}

function removeModFromSlot(slotId){
  if(!player.mods) return;
  delete player.mods[slotId];
  showToast("Module removed.");
  renderMods();
}

function drawModsShip(){
  const canvas=document.getElementById("mods-ship-canvas");
  if(!canvas) return;
  const ctx=canvas.getContext("2d");
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  if(window.shipSprite&&shipSprite.complete&&shipSprite.naturalWidth){
    ctx.save();
    ctx.translate(W/2,H/2);
    ctx.globalCompositeOperation="screen";
    ctx.drawImage(shipSprite,-W/2+15,-H/2+15,W-30,H-30);
    ctx.globalCompositeOperation="source-over";
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(W/2,H/2);
    ctx.strokeStyle="#4a9eff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-70); ctx.lineTo(-40,55); ctx.lineTo(0,35); ctx.lineTo(40,55); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  // Connector dots
  const dots=[[W/2,H*0.12],[W*0.28,H*0.38],[W*0.22,H*0.60],[W*0.32,H*0.82],[W/2,H*0.10],[W*0.72,H*0.38],[W*0.78,H*0.60],[W*0.68,H*0.82]];
  ctx.fillStyle="#4a9effaa";
  dots.forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
}

// ── MISSIONS ─────────────────────────────────────────────────────────────────

function renderMissions(){
  const el=document.getElementById("missions-content");
  let html="";

  if(state.activeMission){
    const am=state.activeMission;
    const isDest=am.destKey===systemKey;
    html+=`
      <div class="mission-card active-mission">
        <div class="mc-badge">ACTIVE MISSION</div>
        <div class="mc-header">
          <span class="mc-icon">${am.icon}</span>
          <span class="mc-title" style="color:#ffcc44">${am.title}</span>
          <span class="mc-pay" style="color:#ffcc44">+${am.pay.toLocaleString()} Cr</span>
        </div>
        <div class="mc-desc">${am.desc}</div>
        <div class="mc-dest">→ Deliver to: <strong style="color:#4aff9a">${SYSTEMS[am.destKey].name}</strong>${isDest?' <span style="color:#4aff9a">— YOU ARE HERE ✓</span>':''}</div>
        ${isDest&&am.type!=="bounty"?`<button class="hub-action-btn green" onclick="completeMissionNow()">✅ COMPLETE MISSION</button>`:""}
      </div><div class="mc-divider"></div>`;
  }

  const available=(state.missions||[]).filter(m=>m.status==="available");
  html+=`<div class="mc-section-title">MISSION BOARD — ${SYSTEMS[systemKey].name.toUpperCase()}</div>`;
  if(available.length===0){
    html+=`<div class="cargo-empty">No missions available at this location.</div>`;
  } else {
    available.forEach(m=>{
      const canAccept=!state.activeMission;
      html+=`
        <div class="mission-card">
          <div class="mc-header">
            <span class="mc-icon">${m.icon}</span>
            <span class="mc-title" style="color:${m.legal?"#c0d8ff":"#ff9944"}">${m.title}${m.legal?"":" ⚠"}</span>
            <span class="mc-pay">+${m.pay.toLocaleString()} Cr</span>
          </div>
          <div class="mc-desc">${m.desc}</div>
          <div class="mc-dest">→ <strong style="color:#4a9eff">${SYSTEMS[m.destKey].name}</strong> · ${SYSTEMS[m.destKey].faction} space</div>
          <button class="hub-action-btn ${m.legal?"green":"yellow"}" ${canAccept?"":"disabled"} onclick="acceptMission(${m.id})">
            ${canAccept?"▶ ACCEPT MISSION":"⏳ MISSION SLOT FULL"}
          </button>
        </div>`;
    });
  }

  // Reputation
  html+=`<div class="mc-section-title" style="margin-top:24px">FACTION STANDING</div><div class="rep-grid">`;
  Object.entries(state.reputation).forEach(([f,v])=>{
    let status="NEUTRAL",sc="#8899aa";
    if(v<=REP_ENEMY_THRESHOLD){sc="#ff2222";status="ENEMY";}
    else if(v<=REP_HOSTILE_THRESHOLD){sc="#ff6644";status="HOSTILE";}
    else if(v>10){sc="#4aff9a";status="FRIENDLY";}
    html+=`<div class="rep-item"><span style="color:${FACTION_COLORS[f]||"#aaa"}">${f.toUpperCase()}</span><span style="color:${sc}">${v>0?"+":""}${v} · ${status}</span></div>`;
  });
  html+=`</div>`;

  el.innerHTML=html;
}

function completeMissionNow(){
  const m=state.activeMission;
  if(!m||m.destKey!==systemKey) return;
  state.credits+=m.pay;
  state.activeMission=null;
  m.status="complete";
  showToast("🎉 Mission complete! +"+m.pay.toLocaleString()+" Cr");
  renderMissions();
  document.getElementById("hub-credits").textContent=state.credits.toLocaleString()+" Cr";
}

// ── TRADING (STUB) ────────────────────────────────────────────────────────────

function renderTrading(){
  document.getElementById("trading-content").innerHTML=`
    <div class="stub-panel">
      <div class="stub-icon">⬡</div>
      <div class="stub-title">TRADING POST</div>
      <div class="stub-desc">The galactic economy is being established.<br>Resources, commodities and trade routes coming soon.</div>
    </div>`;
}

// ── SHIPYARD (STUB) ───────────────────────────────────────────────────────────

function renderShipyard(){
  const has=SYSTEMS[systemKey].hasShipyard;
  document.getElementById("shipyard-content").innerHTML=has?`
    <div class="stub-panel">
      <div class="stub-icon">🛸</div>
      <div class="stub-title">SHIPYARD</div>
      <div class="stub-desc">New hulls and upgrades arriving soon.</div>
    </div>`:`
    <div class="stub-panel">
      <div class="stub-icon">✕</div>
      <div class="stub-title">NO SHIPYARD HERE</div>
      <div class="stub-desc">Travel to a major system to purchase ships and upgrades.</div>
    </div>`;
}

// ── GALAXY MAP ───────────────────────────────────────────────────────────────

let galaxyMapOpen=false;

function openGalaxyMap(){
  galaxyMapOpen=true;
  renderGalaxyMap();
  document.getElementById("galaxymap").classList.add("active");
  document.getElementById("gm-jump-panel").classList.remove("visible");
}

function closeGalaxyMap(){
  galaxyMapOpen=false;
  document.getElementById("galaxymap").classList.remove("active");
  document.getElementById("gm-jump-panel").classList.remove("visible");
}

function clearMapSelection(){
  renderGalaxyMap();
  document.getElementById("gm-jump-panel").classList.remove("visible");
}

function confirmMapJump(){
  const destKey=document.getElementById("gm-jump-btn").dataset.dest;
  const jumps=parseInt(document.getElementById("gm-jump-btn").dataset.jumps)||1;
  if(!destKey) return;
  closeGalaxyMap();
  doJumpTo(destKey,jumps);
}

function doJumpTo(destKey,jumps){
  if(state.fuel<jumps){ showToast("⚠ Not enough fuel!"); return; }
  state.fuel-=jumps;
  document.getElementById("stationscreen").classList.remove("active");
  document.getElementById("ui").classList.remove("docked");
  state.dockedAt=null;
  systemKey=destKey;
  initWorld(systemKey);
  player.x=WORLD/2; player.y=WORLD/2+800;
  player.vx=0; player.vy=0;
  refreshMissions(systemKey);
  showWarpEffect();
  updateHUD();
}

function jumpTo(nk){
  const path=getJumpPath(systemKey,nk);
  doJumpTo(nk,path?path.length-1:1);
}

function getSystemJumpDistance(fromKey,toKey){
  const path=getJumpPath(fromKey,toKey);
  return path?path.length-1:Infinity;
}

function getJumpPath(fromKey,toKey){
  if(fromKey===toKey) return [fromKey];
  const visited={[fromKey]:true};
  const queue=[[fromKey,[fromKey]]];
  while(queue.length){
    const [cur,path]=queue.shift();
    for(const nb of (SYSTEMS[cur].neighbors||[])){
      if(!visited[nb]){
        visited[nb]=true;
        const np=[...path,nb];
        if(nb===toKey) return np;
        queue.push([nb,np]);
      }
    }
  }
  return null;
}

function renderGalaxyMap(){
  const gmCanvas=document.getElementById("galaxymapCanvas");
  if(!gmCanvas) return;
  const W=gmCanvas.width=gmCanvas.parentElement.clientWidth;
  const H=gmCanvas.height=gmCanvas.parentElement.clientHeight-60;
  const ctx=gmCanvas.getContext("2d");
  ctx.clearRect(0,0,W,H);
  const pad=60;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  Object.values(SYSTEMS).forEach(s=>{minX=Math.min(minX,s.x);maxX=Math.max(maxX,s.x);minY=Math.min(minY,s.y);maxY=Math.max(maxY,s.y);});
  function toScreen(sx,sy){ return [pad+(sx-minX)/(maxX-minX)*(W-pad*2),pad+(sy-minY)/(maxY-minY)*(H-pad*2)]; }

  Object.entries(SYSTEMS).forEach(([key,sys])=>{
    const [x1,y1]=toScreen(sys.x,sys.y);
    (sys.neighbors||[]).forEach(nk=>{
      const ns=SYSTEMS[nk]; if(!ns) return;
      const [x2,y2]=toScreen(ns.x,ns.y);
      ctx.strokeStyle="#1e3a5a"; ctx.lineWidth=1; ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.setLineDash([]);
    });
  });

  Object.entries(SYSTEMS).forEach(([key,sys])=>{
    const [x,y]=toScreen(sys.x,sys.y);
    const isCurrent=key===systemKey;
    const isNeighbor=(SYSTEMS[systemKey].neighbors||[]).includes(key);
    const fc=FACTION_COLORS[sys.faction]||"#aaaaaa";
    const r=isCurrent?9:6;
    ctx.beginPath(); ctx.arc(x,y,r+4,0,Math.PI*2);
    ctx.fillStyle=isCurrent?"rgba(74,255,154,0.15)":isNeighbor?"rgba(74,158,255,0.08)":"transparent"; ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=isCurrent?"#4aff9a":fc; ctx.fill();
    ctx.strokeStyle=isCurrent?"#4aff9a":isNeighbor?"#4a9eff44":"#ffffff11"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=isCurrent?"#4aff9a":isNeighbor?"#c0d8ff":"#556677";
    ctx.font=`${isCurrent?12:10}px 'Courier New',monospace`;
    ctx.textAlign="center"; ctx.fillText(sys.name.toUpperCase(),x,y-r-6);
    if(isCurrent){ ctx.fillStyle="#4aff9a"; ctx.font="8px monospace"; ctx.fillText("◆ YOU ARE HERE",x,y+r+14); }
  });

  gmCanvas.onclick=function(e){
    const rect=gmCanvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    let hit=null,hitDist=Infinity;
    Object.entries(SYSTEMS).forEach(([key,sys])=>{
      const [sx,sy]=toScreen(sys.x,sys.y);
      const d=Math.hypot(mx-sx,my-sy);
      if(d<20&&d<hitDist){hit=key;hitDist=d;}
    });
    if(!hit||hit===systemKey) return;
    const path=getJumpPath(systemKey,hit);
    const jumps=path?path.length-1:Infinity;
    const canJump=state.fuel>=jumps;
    document.getElementById("gm-jump-dest").textContent=SYSTEMS[hit].name.toUpperCase();
    document.getElementById("gm-jump-info").textContent=`${jumps} jump${jumps!==1?"s":""} away · ${state.fuel} fuel remaining`;
    document.getElementById("gm-jump-route").textContent=path?path.map(k=>SYSTEMS[k].name).join(" → "):"No route found";
    const btn=document.getElementById("gm-jump-btn");
    btn.textContent=canJump?"⬡ JUMP":"⚠ NOT ENOUGH FUEL";
    btn.disabled=!canJump; btn.dataset.dest=hit; btn.dataset.jumps=jumps;
    document.getElementById("gm-jump-panel").classList.add("visible");
  };
}

// ── SAVE / QUIT ──────────────────────────────────────────────────────────────

function hubSaveAndQuit(){
  saveCurrentPilot("manual");
  showToast("✓ Game saved.");
}

// ── ALIASES ──────────────────────────────────────────────────────────────────

function renderStation(){ hubOpen(null); }
function renderDockScreen(){ hubOpen(null); }
