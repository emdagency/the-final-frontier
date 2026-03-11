// ── DOCK / STATION ────────────────────────────────────────────────────────────
function dockShip(){
  const dockDist=Math.sqrt(dist2(player,station));
  const planetDist=Math.sqrt(dist2(player,planet));
  const sysFac = SYSTEMS[systemKey].faction;
  const sysRep = state.reputation[sysFac] || 0;
  const stationHostile = !station.owned && sysRep <= REP_HOSTILE_THRESHOLD;
  if(dockDist<=130 && !stationHostile) { state.dockedAt="station"; enterDock(); }
  else if(dockDist<=130 && stationHostile) { showToast("🚫 Hostile station — cannot dock!"); }
  else if(planetDist<=planet.r+60) { state.dockedAt="planet"; enterDock(); }
}

function enterDock(){
  gameMode="station";
  setThruster(0);
  player.shield = player.maxShield; // shields fully restored on docking
  document.getElementById("ui").classList.add("docked");
  checkMissionCompletion(systemKey);
  refreshMissions(systemKey);
  document.getElementById("stationscreen").classList.add("active");
  renderDockScreen();
  saveCurrentPilot("dock");
}

// Keep enterStation as alias for emergency dock
function enterStation(){ state.dockedAt="station"; enterDock(); }

function renderDockScreen(){
  const sys=SYSTEMS[systemKey];
  const color=FACTION_COLORS[sys.faction];
  const isPlanet = state.dockedAt === "planet";

  document.getElementById("st-title").textContent = isPlanet
    ? (planet.name || sys.name).toUpperCase() + " — SURFACE"
    : sys.name.toUpperCase()+" STATION";
  document.getElementById("st-title").style.color=color;
  document.getElementById("st-sub").textContent = isPlanet
    ? sys.faction.toUpperCase()+" SPACE — Planetary surface. Local facilities available."
    : sys.faction.toUpperCase()+" SPACE — "+sys.desc;
  document.getElementById("st-hull").textContent=player.hull+"/"+player.maxHull;
  document.getElementById("st-credits").textContent=state.credits.toLocaleString();
  document.getElementById("st-fuel").textContent=state.fuel+"/"+state.maxFuel;
  document.getElementById("st-kills").textContent=state.kills;

  // Repair buttons
  const rb1=document.getElementById("btn-repair-small");
  const rb2=document.getElementById("btn-repair-full");
  const repairCost1 = isPlanet ? 80 : 50;
  const repairCost2 = isPlanet ? 280 : 200;
  rb1.textContent = `⚙ Repair +30 hull — ${repairCost1} Cr`;
  rb2.textContent = `⚙ Full Repair — ${repairCost2} Cr`;
  rb1.disabled = state.credits<repairCost1 || player.hull>=player.maxHull;
  rb2.disabled = state.credits<repairCost2 || player.hull>=player.maxHull;
  rb1.onclick=()=>{if(state.credits>=repairCost1&&player.hull<player.maxHull){state.credits-=repairCost1;player.hull=Math.min(player.maxHull,player.hull+30);renderDockScreen();}};
  rb2.onclick=()=>{if(state.credits>=repairCost2&&player.hull<player.maxHull){state.credits-=repairCost2;player.hull=player.maxHull;renderDockScreen();}};
  document.getElementById("btn-launch").textContent = isPlanet ? "▶ Lift Off" : "▶ Launch into Space";
  document.getElementById("btn-launch").onclick=launchShip;

  // Nav list — only available from station
  const navCard = document.getElementById("nav-card");
  if (isPlanet) {
    navCard.style.display = "none";
  } else {
    navCard.style.display = "";
    const navList=document.getElementById("nav-list");
    navList.innerHTML="";
    sys.neighbors.forEach(nk=>{
      const ns=SYSTEMS[nk],nc=FACTION_COLORS[ns.faction];
      const row=document.createElement("div"); row.className="nav-dest";
      row.innerHTML=`
        <div>
          <div class="nav-dest-name" style="color:${nc}">${ns.name.toUpperCase()}</div>
          <div class="nav-dest-desc">${ns.faction.toUpperCase()} · ${ns.desc}</div>
        </div>
        <button class="nav-dest-btn" style="background:${nc}22;color:${nc};border:1px solid ${nc}44" ${state.fuel<1?"disabled":""}>JUMP →</button>
      `;
      row.querySelector("button").onclick=()=>jumpTo(nk);
      navList.appendChild(row);
    });
  }

  // ── MISSIONS ──────────────────────────────────────────────────────────────────
  const missionsList = document.getElementById("missions-list");
  missionsList.innerHTML = "";

  // Show active mission status at top if we have one
  if (state.activeMission) {
    const am = state.activeMission;
    const isDestination = am.destKey === systemKey;
    const div = document.createElement("div");
    div.className = "mission-row mission-active";
    div.innerHTML = `
      <div class="mission-header">
        <span class="mission-icon">${am.icon}</span>
        <span class="mission-title" style="color:#ffcc44">${am.title}</span>
        <span class="mission-pay" style="color:#ffcc44">+${am.pay.toLocaleString()} Cr</span>
      </div>
      <div class="mission-desc">${am.desc}</div>
      <div class="mission-dest">→ Deliver to: <strong style="color:#4aff9a">${SYSTEMS[am.destKey].name}</strong>
        ${isDestination ? ' <span style="color:#4aff9a">— YOU ARE HERE ✓</span>' : ''}
      </div>
      ${isDestination && (am.type!=="bounty") ? `<button class="btn green" onclick="completeMissionNow()">✅ Complete Mission</button>` : ''}
    `;
    missionsList.appendChild(div);

    const sep = document.createElement("div");
    sep.style = "border-top:1px solid #1e3050;margin:8px 0;";
    missionsList.appendChild(sep);
  }

  if (state.missions.length === 0) {
    missionsList.innerHTML += `<div style="color:#3a6090;font-size:11px;padding:6px 0;">No missions available. Check back later.</div>`;
  } else {
    state.missions.filter(m=>m.status==="available").forEach(m => {
      const canAccept = !state.activeMission;
      const div = document.createElement("div");
      div.className = "mission-row";
      div.innerHTML = `
        <div class="mission-header">
          <span class="mission-icon">${m.icon}</span>
          <span class="mission-title" style="color:${m.legal?'#c0d8ff':'#ff9944'}">${m.title}${m.legal?'':' ⚠'}</span>
          <span class="mission-pay">+${m.pay.toLocaleString()} Cr</span>
        </div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-dest">→ Destination: <strong style="color:#4a9eff">${SYSTEMS[m.destKey].name}</strong> · ${SYSTEMS[m.destKey].faction} space</div>
        <button class="btn ${m.legal?'green':'yellow'}" ${canAccept?'':'disabled'} onclick="acceptMission(${m.id})">
          ${canAccept ? '▶ Accept Mission' : '⏳ Mission Slot Full'}
        </button>
      `;
      missionsList.appendChild(div);
    });
  }

  // Reputation
  const repList=document.getElementById("rep-list");
  repList.innerHTML="";
  Object.entries(state.reputation).forEach(([f,v])=>{
    const div=document.createElement("div"); div.className="rep-row";
    let status = "";
    let vc;
    if (v <= REP_ENEMY_THRESHOLD) { vc="#ff2222"; status=" ⚠ ENEMY"; }
    else if (v <= REP_HOSTILE_THRESHOLD) { vc="#ff6644"; status=" ✗ HOSTILE"; }
    else if (v > 10) { vc="#4aff9a"; status=" ✓ FRIENDLY"; }
    else { vc="#8899aa"; status=""; }
    div.innerHTML=`<span style="color:${FACTION_COLORS[f]||'#aaa'};text-transform:capitalize">${f}</span><span style="color:${vc}">${v>0?"+":""}${v}${status}</span>`;
    repList.appendChild(div);
  });

  // Owned stations
  const ownedKeys = Object.keys(state.ownedStations);
  if (ownedKeys.length > 0) {
    const stDiv = document.createElement("div");
    stDiv.style = "margin-top:10px;border-top:1px solid #1e3050;padding-top:8px;";
    stDiv.innerHTML = `<div class="card-title" style="color:#4aff9a">★ OWNED STATIONS (${ownedKeys.length})</div>`;
    ownedKeys.forEach(sk => {
      const row = document.createElement("div");
      row.className = "rep-row";
      row.innerHTML = `<span style="color:#4aff9a">${SYSTEMS[sk]?.name || sk}</span><span style="color:#ffcc44">+50 Cr/tick</span>`;
      stDiv.appendChild(row);
    });
    repList.appendChild(stDiv);
  }
}

// Keep renderStation as alias
function renderStation(){ renderDockScreen(); }

function completeMissionNow() {
  const m = state.activeMission;
  if (!m) return;
  m.status = "complete";
  state.credits += m.pay;
  state.activeMission = null;
  if (m.type === "smuggle") state.reputation.pirate = Math.min(100, (state.reputation.pirate||0) + 5);
  else state.reputation.federation = Math.min(100, (state.reputation.federation||0) + 3);
  updateHUD();
  showToast(`🎉 Mission complete! +${m.pay.toLocaleString()} Cr`);
  renderDockScreen();
}

function launchShip(){
  document.getElementById("stationscreen").classList.remove("active");
  document.getElementById("ui").classList.remove("docked");
  gameMode="flight";
  updateHUD();
  saveCurrentPilot("launch");
}

function jumpTo(nk){
  state.fuel=Math.max(0,state.fuel-1);
  doJumpTo(nk, 1);
}

// ── GALAXY MAP ────────────────────────────────────────────────────────────────
let galaxyMapOpen = false;
let gmSelectedKey = null; // currently selected (but not yet jumped) system

function openGalaxyMap() {
  galaxyMapOpen = true;
  gmSelectedKey = null;
  document.getElementById("galaxymap").classList.add("active");
  document.getElementById("gm-fuel-display").textContent = `FUEL: ${state.fuel} JUMP${state.fuel===1?'':'S'}`;
  document.getElementById("gm-jump-panel").classList.remove("visible");
  renderGalaxyMap();
}

function closeGalaxyMap() {
  galaxyMapOpen = false;
  gmSelectedKey = null;
  document.getElementById("galaxymap").classList.remove("active");
  document.getElementById("gm-jump-panel").classList.remove("visible");
}

function clearMapSelection() {
  gmSelectedKey = null;
  document.getElementById("gm-jump-panel").classList.remove("visible");
  renderGalaxyMap();
}

function confirmMapJump() {
  if (!gmSelectedKey || gmSelectedKey === systemKey) return;
  const jumpDists = {};
  Object.keys(SYSTEMS).forEach(sk => { jumpDists[sk] = getSystemJumpDistance(systemKey, sk); });
  const jumps = jumpDists[gmSelectedKey];
  if (jumps > state.fuel) return;
  closeGalaxyMap();
  // Fuel cost = number of jumps
  state.fuel = Math.max(0, state.fuel - jumps);
  const destKey = gmSelectedKey;
  gmSelectedKey = null;
  // Warp effect then arrive at edge
  doJumpTo(destKey, jumps);
}

function doJumpTo(destKey, jumps) {
  // Flash warp overlay
  const overlay = document.getElementById("warpoverlay");
  overlay.style.transition = "none";
  overlay.style.opacity = "1";
  setTimeout(() => {
    overlay.style.transition = "opacity 0.8s";
    overlay.style.opacity = "0";
  }, 180);

  systemKey = destKey;
  initWorld(destKey, true); // spawn at edge
  checkMissionCompletion(destKey);
  refreshMissions(destKey);
  updateHUD();
  // Switch to flight mode (player must fly in to find things)
  document.getElementById("stationscreen").classList.remove("active");
  document.getElementById("ui").classList.remove("docked");
  gameMode = "flight";
  showToast(`⬡ Jumped to ${SYSTEMS[destKey].name} (${jumps} jump${jumps===1?"":"s"}, ${state.fuel} fuel remaining)`);
  saveCurrentPilot("jump");
}

function getSystemJumpDistance(fromKey, toKey) {
  if (fromKey === toKey) return 0;
  const visited = new Set([fromKey]);
  const queue = [[fromKey, 0]];
  while (queue.length > 0) {
    const [cur, dist] = queue.shift();
    for (const nb of SYSTEMS[cur].neighbors) {
      if (nb === toKey) return dist + 1;
      if (!visited.has(nb)) { visited.add(nb); queue.push([nb, dist+1]); }
    }
  }
  return Infinity;
}

function getJumpPath(fromKey, toKey) {
  // BFS to find actual path
  if (fromKey === toKey) return [fromKey];
  const prev = {[fromKey]: null};
  const queue = [fromKey];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nb of SYSTEMS[cur].neighbors) {
      if (nb in prev) continue;
      prev[nb] = cur;
      if (nb === toKey) {
        // reconstruct
        const path = [toKey];
        let c = toKey;
        while (prev[c] !== null) { c = prev[c]; path.unshift(c); }
        return path;
      }
      queue.push(nb);
    }
  }
  return null;
}

function renderGalaxyMap() {
  const gmCanvas = document.getElementById("galaxymapCanvas");
  const W = window.innerWidth, H = window.innerHeight;
  gmCanvas.width = W; gmCanvas.height = H;
  const gc = gmCanvas.getContext("2d");

  const topPad = 54, botPad = 80, sidePad = 30;
  const mapW = W - sidePad*2, mapH = H - topPad - botPad;

  const xs = Object.values(SYSTEMS).map(s=>s.x);
  const ys = Object.values(SYSTEMS).map(s=>s.y);
  const minX = Math.min(...xs)-40, maxX = Math.max(...xs)+40;
  const minY = Math.min(...ys)-40, maxY = Math.max(...ys)+40;

  function toScreen(sx, sy) {
    return [
      sidePad + (sx - minX) / (maxX - minX) * mapW,
      topPad + (sy - minY) / (maxY - minY) * mapH
    ];
  }

  gc.clearRect(0, 0, W, H);
  gc.fillStyle = "#060c14";
  gc.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const sx = Math.random()*W, sy = Math.random()*H;
    const sr = Math.random()*1.3+0.2;
    gc.fillStyle = `rgba(255,255,255,${Math.random()*0.4+0.1})`;
    gc.beginPath(); gc.arc(sx, sy, sr, 0, Math.PI*2); gc.fill();
  }

  const fuel = state.fuel;
  const jumpDists = {};
  Object.keys(SYSTEMS).forEach(sk => { jumpDists[sk] = getSystemJumpDistance(systemKey, sk); });

  // Get route path if a system is selected
  let selectedPath = null;
  if (gmSelectedKey && gmSelectedKey !== systemKey) {
    selectedPath = getJumpPath(systemKey, gmSelectedKey);
  }

  // Draw all edges
  const drawn = new Set();
  Object.entries(SYSTEMS).forEach(([sk, s]) => {
    s.neighbors.forEach(nk => {
      const edgeKey = [sk,nk].sort().join("-");
      if (drawn.has(edgeKey)) return;
      drawn.add(edgeKey);
      const [x1,y1] = toScreen(s.x, s.y);
      const [x2,y2] = toScreen(SYSTEMS[nk].x, SYSTEMS[nk].y);
      const reachable = jumpDists[sk] <= fuel && jumpDists[nk] <= fuel;
      // Check if this edge is on the selected route
      const onRoute = selectedPath && selectedPath.includes(sk) && selectedPath.includes(nk) &&
        Math.abs(selectedPath.indexOf(sk) - selectedPath.indexOf(nk)) === 1;
      if (onRoute) {
        gc.strokeStyle = "#4affcc";
        gc.lineWidth = 2.5;
        gc.setLineDash([]);
        // Draw animated dashes for route
        gc.shadowColor = "#4affcc"; gc.shadowBlur = 8;
      } else {
        gc.strokeStyle = reachable ? "rgba(74,158,255,0.35)" : "rgba(40,60,90,0.4)";
        gc.lineWidth = reachable ? 1.5 : 1;
        gc.setLineDash(reachable ? [] : [4,5]);
        gc.shadowBlur = 0;
      }
      gc.beginPath(); gc.moveTo(x1,y1); gc.lineTo(x2,y2); gc.stroke();
      gc.setLineDash([]); gc.shadowBlur = 0;
    });
  });

  if (fuel > 0) {
    gc.font = "10px 'Courier New'"; gc.textAlign = "left";
    gc.fillStyle = "#4a9eff55";
    gc.fillText(`Jump range: ${fuel} system${fuel===1?'':'s'}`, sidePad, topPad - 6);
  }

  // Draw systems
  Object.entries(SYSTEMS).forEach(([sk, s]) => {
    const [sx, sy] = toScreen(s.x, s.y);
    const jumps = jumpDists[sk];
    const inRange = jumps <= fuel && jumps > 0;
    const isCurrent = sk === systemKey;
    const isSelected = sk === gmSelectedKey;
    const facColor = FACTION_COLORS[s.faction] || "#aaaaaa";
    const owned = state.ownedStations[sk];
    const explored = state.exploredSystems && state.exploredSystems[sk];
    const onRoute = selectedPath && selectedPath.includes(sk);

    // Glow
    if (isSelected) {
      gc.beginPath(); gc.arc(sx, sy, 24, 0, Math.PI*2);
      const grd = gc.createRadialGradient(sx,sy,0,sx,sy,24);
      grd.addColorStop(0, "#4affcc55"); grd.addColorStop(1,"transparent");
      gc.fillStyle=grd; gc.fill();
      gc.shadowColor="#4affcc"; gc.shadowBlur=14;
    } else if (inRange || isCurrent) {
      gc.beginPath(); gc.arc(sx, sy, isCurrent ? 22 : 16, 0, Math.PI*2);
      const grd = gc.createRadialGradient(sx,sy,0,sx,sy,isCurrent?22:16);
      grd.addColorStop(0, (isCurrent?"#00ffdd":"#4a9eff")+"33");
      grd.addColorStop(1, "transparent");
      gc.fillStyle = grd; gc.fill();
      gc.shadowBlur = 0;
    }

    // Node circle
    const r = isCurrent ? 12 : (isSelected ? 11 : 9);
    gc.beginPath(); gc.arc(sx, sy, r, 0, Math.PI*2);
    if (isSelected) {
      gc.fillStyle = "#4affcc22"; gc.fill();
      gc.strokeStyle = "#4affcc"; gc.lineWidth = 2.5; gc.stroke();
    } else if (isCurrent) {
      gc.fillStyle = "#00ffdd22"; gc.fill();
      gc.strokeStyle = "#00ffdd"; gc.lineWidth = 2; gc.stroke();
    } else if (inRange) {
      gc.fillStyle = facColor+"33"; gc.fill();
      gc.strokeStyle = facColor; gc.lineWidth = 1.5; gc.stroke();
    } else {
      gc.fillStyle = "#0d1520"; gc.fill();
      gc.strokeStyle = "#2a3a50"; gc.lineWidth = 1; gc.stroke();
    }
    gc.shadowBlur = 0;

    // Owned indicator
    if (owned) {
      gc.beginPath(); gc.arc(sx, sy-r-5, 4, 0, Math.PI*2);
      gc.fillStyle = "#4aff9a"; gc.fill();
    }

    // Fog of war — unexplored shows as "???" for system name
    gc.font = `${isCurrent||isSelected?"bold ":""}11px 'Courier New'`;
    gc.textAlign = "center";
    gc.fillStyle = isSelected ? "#4affcc" : isCurrent ? "#00ffdd" : (inRange ? facColor : "#3a5070");
    if (explored || isCurrent) {
      gc.fillText(s.name.toUpperCase(), sx, sy + r + 14);
    } else {
      gc.fillStyle = inRange ? "#4a6080" : "#2a3a50";
      gc.fillText("UNKNOWN", sx, sy + r + 14);
    }

    gc.font = "9px 'Courier New'";
    gc.fillStyle = isSelected ? "#4affccaa" : isCurrent ? "#4aff9a88" : (inRange ? "#4a6080" : "#2a3a50");
    if (isCurrent) {
      gc.fillText("◉ HERE", sx, sy + r + 25);
    } else if (isSelected) {
      gc.fillText(`${jumps} jump${jumps===1?"":"s"} · SELECTED`, sx, sy + r + 25);
    } else {
      gc.fillText(`${jumps===Infinity?"∞":jumps} jump${jumps===1?"":"s"}`, sx, sy + r + 25);
    }
  });

  // Click/tap handler
  gmCanvas.onclick = null;
  gmCanvas.onclick = function(e) {
    const rect = gmCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let clickedKey = null, clickedDist = Infinity;
    Object.entries(SYSTEMS).forEach(([sk, s]) => {
      const [sx, sy] = toScreen(s.x, s.y);
      const d = Math.hypot(mx-sx, my-sy);
      if (d < 28 && d < clickedDist) { clickedDist=d; clickedKey=sk; }
    });
    if (!clickedKey) { clearMapSelection(); return; }
    if (clickedKey === systemKey) { clearMapSelection(); return; }

    const jumps = jumpDists[clickedKey];
    if (jumps > fuel) {
      showToast(`⛽ Not enough fuel — need ${jumps} jumps, have ${fuel}`);
      gmSelectedKey = null;
      document.getElementById("gm-jump-panel").classList.remove("visible");
      renderGalaxyMap();
      return;
    }

    // Select the system and show confirm panel
    gmSelectedKey = clickedKey;
    const sys = SYSTEMS[clickedKey];
    const explored = state.exploredSystems && state.exploredSystems[clickedKey];
    document.getElementById("gm-jump-dest").textContent = explored ? sys.name.toUpperCase() : "UNKNOWN SYSTEM";
    document.getElementById("gm-jump-info").textContent =
      `${jumps} jump${jumps===1?"":"s"} away · ${state.fuel - jumps} fuel remaining after`;
    document.getElementById("gm-jump-route").textContent =
      explored ? `${sys.faction.toUpperCase()} SPACE — ${sys.desc}` : "System contents unknown";
    document.getElementById("gm-jump-btn").disabled = false;
    document.getElementById("gm-jump-panel").classList.add("visible");

    renderGalaxyMap();
  };
}

// Also allow opening galaxy map from keyboard
document.addEventListener("keydown", e => {
  if (isTyping()) return;
  if ((e.key === "g" || e.key === "G") && (gameMode === "flight" || gameMode === "station")) {
    e.preventDefault();
    if (galaxyMapOpen) closeGalaxyMap(); else openGalaxyMap();
  }
  if (e.key === "Escape" && galaxyMapOpen) closeGalaxyMap();
});

// New pilot name validation
const newPilotInput = document.getElementById("new-pilot-name");
const newPilotBtn = document.getElementById("new-pilot-btn");
if (newPilotInput && newPilotBtn) {
  newPilotInput.addEventListener("input", () => {
    newPilotBtn.disabled = newPilotInput.value.trim().length === 0;
  });
  newPilotInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && newPilotInput.value.trim()) createNewPilot();
  });
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
