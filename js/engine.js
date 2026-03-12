// ── STATE ────────────────────────────────────────────────────────────────────
const rand = (a,b) => Math.random()*(b-a)+a;
const dist2 = (a,b) => (a.x-b.x)**2+(a.y-b.y)**2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
let uid = 0; const mkid = () => ++uid;

let gameMode = "station"; // flight | station
let systemKey = "sol";

// ── SAVE / PILOT SYSTEM ───────────────────────────────────────────────────────
let currentPilotId = null;

function getPilots() {
  try { return JSON.parse(localStorage.getItem("tff_pilots") || "[]"); } catch { return []; }
}
function savePilots(arr) {
  localStorage.setItem("tff_pilots", JSON.stringify(arr));
}
function buildSaveData() {
  return {
    systemKey,
    player: { hull:player.hull, maxHull:player.maxHull, shield:player.shield, maxShield:player.maxShield,
              speed:player.speed, turnRate:player.turnRate, thrust:player.thrust, shipType:player.shipType },
    state: JSON.parse(JSON.stringify(state)),
  };
}
function loadSaveData(data) {
  if (!data) return;
  systemKey = data.systemKey || "sol";
  if (data.player) Object.assign(player, data.player);
  if (data.state) Object.assign(state, data.state);
}
function saveCurrentPilot(reason) {
  if (!currentPilotId) return;
  const pilots = getPilots();
  const idx = pilots.findIndex(p => p.id === currentPilotId);
  if (idx < 0) return;
  pilots[idx].save = buildSaveData();
  pilots[idx].lastSeen = Date.now();
  pilots[idx].location = SYSTEMS[systemKey].name;
  savePilots(pilots);
}

function showStartScreen() {
  document.getElementById("startscreen").classList.remove("hidden");
  renderPilotList();
  animateStartStars();
}
function hideStartScreen() {
  document.getElementById("startscreen").classList.add("hidden");
}

function renderPilotList() {
  const pilots = getPilots();
  const listEl = document.getElementById("pilot-list");
  const titleEl = document.getElementById("pilots-title");
  listEl.innerHTML = "";
  if (pilots.length === 0) {
    listEl.innerHTML = `<div style="color:#2a4060;font-size:11px;padding:8px 0;text-align:center;letter-spacing:1px;">No pilots found. Create one below.</div>`;
    titleEl.textContent = "NO PILOTS";
    return;
  }
  titleEl.textContent = `SAVED PILOTS (${pilots.length})`;
  pilots.sort((a,b) => (b.lastSeen||0)-(a.lastSeen||0)).forEach(p => {
    const card = document.createElement("div");
    card.className = "pilot-card";
    const date = p.lastSeen ? new Date(p.lastSeen).toLocaleDateString() : "—";
    const loc = p.location || "Sol";
    const credits = p.save?.state?.credits ? p.save.state.credits.toLocaleString() + " Cr" : "5,000 Cr";
    card.innerHTML = `
      <div class="pilot-card-info">
        <div class="pilot-card-name">${p.name}</div>
        <div class="pilot-card-stats">${loc} · ${credits} · ${date}</div>
      </div>
      <button class="pilot-card-play" onclick="launchPilot('${p.id}')">▶ PLAY</button>
      <button class="pilot-card-delete" title="Delete pilot" onclick="deletePilot('${p.id}',event)">✕</button>
    `;
    listEl.appendChild(card);
  });
}

function launchPilot(id) {
  const pilots = getPilots();
  const p = pilots.find(pp => pp.id === id);
  if (!p) return;
  currentPilotId = id;
  if (p.save) {
    loadSaveData(p.save);
  }
  startGame();
}

function deletePilot(id, e) {
  e.stopPropagation();
  const pilots = getPilots().filter(p => p.id !== id);
  savePilots(pilots);
  renderPilotList();
}

function createNewPilot() {
  const nameInput = document.getElementById("new-pilot-name");
  const rawName = nameInput.value.trim();
  if (!rawName) return;
  const fullName = "Capt. " + rawName;
  const id = "pilot_" + Date.now();
  const pilots = getPilots();
  pilots.push({ id, name: fullName, lastSeen: Date.now(), location: "Sol" });
  savePilots(pilots);
  currentPilotId = id;
  // Reset to fresh state
  resetToFreshState();
  startGame();
}

function resetToFreshState() {
  systemKey = "sol";
  player.hull = 100; player.maxHull = 100;
  player.shield = 30; player.maxShield = 30;
  player.speed = 3.2; player.turnRate = 0.07; player.thrust = 0.18;
  player.shipType = "Shuttle";
  state.credits = 5000; state.fuel = 10; state.maxFuel = 10;
  state.kills = 0;
  state.reputation = {federation:0,rebel:0,pirate:0,centaurian:0,neutral:0};
  state.missions = []; state.activeMission = null;
  state.dockedAt = null; state.ownedStations = {};
  state.tributeTimer = 0;
  state.exploredSystems = { sol: true }; // sol is where you start
  state.systemContents = {};
}

function startGame() {
  hideStartScreen();
  if (!state.exploredSystems) state.exploredSystems = { sol: true };
  if (!state.systemContents) state.systemContents = {};
  initWorld(systemKey);
  updateHUD();
  state.dockedAt = "station";
  refreshMissions(systemKey);
  enterDock();
  requestAnimationFrame(tick);
}

// Animate stars on start screen
let startStarAnim = null;
function animateStartStars() {
  const canvas = document.getElementById("startStarCanvas");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx2 = canvas.getContext("2d");
  const stars2 = Array.from({length:180},()=>({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    r:Math.random()*1.4+0.2, o:Math.random()*0.5+0.1,
    twinkle:Math.random()*Math.PI*2, twinkleSpeed:Math.random()*0.03+0.01
  }));
  function frame() {
    if (document.getElementById("startscreen").classList.contains("hidden")) return;
    ctx2.clearRect(0,0,canvas.width,canvas.height);
    stars2.forEach(s => {
      s.twinkle += s.twinkleSpeed;
      const alpha = s.o * (0.6 + 0.4*Math.sin(s.twinkle));
      ctx2.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx2.beginPath(); ctx2.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx2.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}

// Validate new pilot name input
document.addEventListener("DOMContentLoaded", () => {}); // handled inline below

const player = {
  x:WORLD/2, y:WORLD/2, vx:0, vy:0, angle:0,
  hull:100, maxHull:100, shield:30, maxShield:30,
  speed:3.2, turnRate:0.07, thrust:0.18,
  shipType:"Shuttle", shootCooldown:0,
};
const state = {
  credits:5000, fuel:10, maxFuel:10,
  kills:0,
  reputation:{federation:0,rebel:0,pirate:0,centaurian:0,neutral:0},
  missions:[],        // available missions at current location
  activeMission:null, // currently accepted mission
  dockedAt:null,      // "station" | "planet"
  ownedStations:{},   // systemKey -> true if player owns that station
  tributeTimer:0,     // seconds until next tribute tick
  exploredSystems:{ sol: true }, // systems the player has visited
  systemContents:{},  // systemKey -> { planet:{x,y,...}, station:{x,y,...} } revealed contents
};
// Reputation thresholds:
//  < -25: system ships become immediately hostile on entry
//  < -50: enemy (bounty hunters spawn occasionally)
const REP_HOSTILE_THRESHOLD = -25;
const REP_ENEMY_THRESHOLD   = -50;

// ── PLAYER SPRITE ─────────────────────────────────────────────────────────────
const shipSprite = new Image();
shipSprite.src = SHIP_B64;

let enemies=[], bullets=[], particles=[], stars=[], asteroids=[];
let planet={}, station={};
let bountyHunterTimer = 0;
let systemFogRevealed = { planet: true, station: true }; // tracks fog reveals per system visit

// ── CANVAS SETUP ─────────────────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const mmCanvas = document.getElementById("minimapCanvas");
const mmCtx = mmCanvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ── WORLD INIT ───────────────────────────────────────────────────────────────
let arriveFromEdge = false; // true = player spawns at edge after jump

function initWorld(sk, spawnAtEdge) {
  const sys = SYSTEMS[sk];
  const faction = sys.faction;
  const fc = FACTION_COLORS[faction];

  if (spawnAtEdge) {
    // Spawn at a random edge of the world
    const edge = Math.floor(Math.random()*4);
    const margin = 80;
    if (edge===0)      { player.x=WORLD/2+rand(-400,400); player.y=margin; player.angle=Math.PI/2; }
    else if (edge===1) { player.x=WORLD-margin; player.y=WORLD/2+rand(-400,400); player.angle=Math.PI; }
    else if (edge===2) { player.x=WORLD/2+rand(-400,400); player.y=WORLD-margin; player.angle=-Math.PI/2; }
    else               { player.x=margin; player.y=WORLD/2+rand(-400,400); player.angle=0; }
    player.vx=0; player.vy=0;
  } else {
    player.x=WORLD/2; player.y=WORLD/2; player.vx=0; player.vy=0; player.angle=0;
  }

  // Mark system as explored (reveals contents permanently)
  if (!state.exploredSystems) state.exploredSystems = {};
  // We don't mark explored yet on jump — that happens when player flies near objects

  // Weighted random pick from Centaurian fleet
  function pickCentaurianType() {
    const total = CENTAURIAN_FLEET.reduce((s,e)=>s+e.weight,0);
    let r = Math.random()*total;
    for (const e of CENTAURIAN_FLEET) { r-=e.weight; if(r<=0) return e; }
    return CENTAURIAN_FLEET[0];
  }

  // 4-6 Centaurian ships per sector, plus any faction-specific hostiles
  const centCount = Math.floor(rand(4,7));
  enemies = [];

  for (let i=0; i<centCount; i++) {
    const def = pickCentaurianType();
    const st = SHIP_TYPES[def.type];
    const a=rand(0,Math.PI*2), r=rand(500,1400);
    enemies.push({
      id:mkid(), x:WORLD/2+Math.cos(a)*r, y:WORLD/2+Math.sin(a)*r,
      vx:rand(-0.5,0.5), vy:rand(-0.5,0.5), angle:rand(0,Math.PI*2),
      hull:st.maxHull, maxHull:st.maxHull,
      shield:st.maxShield, maxShield:st.maxShield,
      speed:st.speed*rand(0.88,1.12), turnRate:st.turnRate, thrust:st.thrust,
      color:st.color, label:def.label, bounty:def.bounty,
      hostile:false, shootCooldown:0, shipType:def.type,
      faction:"centaurian",
    });
  }

  // Extra hostile ships for pirate sectors
  if (faction==="pirate") {
    const cfg = ENEMY_CFGS.pirate;
    const st = SHIP_TYPES[cfg.shipType];
    for (let i=0;i<3;i++) {
      const a=rand(0,Math.PI*2),r=rand(400,900);
      enemies.push({
        id:mkid(), x:WORLD/2+Math.cos(a)*r, y:WORLD/2+Math.sin(a)*r,
        vx:0,vy:0, angle:rand(0,Math.PI*2),
        hull:st.maxHull, maxHull:st.maxHull,
        shield:st.maxShield, maxShield:st.maxShield,
        speed:st.speed*rand(0.85,1.1), turnRate:st.turnRate, thrust:st.thrust,
        color:cfg.color, label:cfg.label, bounty:[200,450],
        hostile:true, shootCooldown:0, shipType:cfg.shipType,
        faction:"pirate",
      });
    }
  }

  bullets=[]; particles=[]; asteroids=[];

  // Spawn asteroids — scattered across the world, away from station spawn zone
  const astCount = { large:3, medium:6, small:10 };
  Object.entries(astCount).forEach(([size, count])=>{
    for(let i=0;i<count;i++){
      let ax,ay;
      // Keep away from centre (station area) and planet
      do {
        ax = rand(200, WORLD-200);
        ay = rand(200, WORLD-200);
      } while(Math.hypot(ax-WORLD/2,ay-WORLD/2) < 350);
      spawnAsteroid(ax, ay, size);
    }
  });

  // Use saved positions if system was explored before, otherwise generate & save
  if (!state.systemContents) state.systemContents = {};
  let contents = state.systemContents[sk];

  // Fixed positions for known systems — ensures layout is always the same
  const FIXED_LAYOUTS = {
    sol: { planetX: WORLD/2+420, planetY: WORLD/2-310, planetR: 110,
           stationX: WORLD/2-180, stationY: WORLD/2+140 },
  };

  if (!contents) {
    if (FIXED_LAYOUTS[sk]) {
      contents = { ...FIXED_LAYOUTS[sk] };
    } else {
      contents = {
        planetX: WORLD/2+rand(-600,600), planetY: WORLD/2+rand(-600,600),
        planetR: rand(70,140),
        stationX: WORLD/2+rand(-250,250), stationY: WORLD/2+rand(-250,250),
      };
    }
    state.systemContents[sk] = contents;
  }

  planet = {
    x: contents.planetX, y: contents.planetY,
    r: contents.planetR,
    color:fc,
    name: sys.name
  };

  const stationOwned = state.ownedStations[sk];
  const stationColor = stationOwned ? "#4aff9a" : fc;
  station = {
    x: contents.stationX, y: contents.stationY,
    color: stationColor,
    owned: stationOwned || false,
    hull: stationOwned ? 800 : 600,
    maxHull: stationOwned ? 800 : 600,
    shield: stationOwned ? 0 : 150,
    maxShield: stationOwned ? 0 : 150,
    shootCooldown: 0,
    faction: faction,
  };

  // Fog of war — track what the player has seen in this system
  // 'explored' = true once they fly close to planets/station
  // For starting system (sol) or previously docked, reveal immediately
  if (!state.exploredSystems) state.exploredSystems = {};
  const alreadyExplored = state.exploredSystems[sk];
  // fogReveal tracks partial reveals within the current session (cleared on arrival at new systems)
  systemFogRevealed = { planet: alreadyExplored, station: alreadyExplored };

  // If reputation with this system's faction is below hostile threshold, all ships are immediately hostile
  const sysRep = state.reputation[faction] || 0;
  if (sysRep <= REP_HOSTILE_THRESHOLD) {
    enemies.forEach(e => { if (e.faction === faction || e.faction === "centaurian") e.hostile = true; });
    if (sysRep <= REP_HOSTILE_THRESHOLD) showToast(`⚠ ${sys.faction.toUpperCase()} FACTION — HOSTILE TERRITORY`);
  }

  bountyHunterTimer = 600 + rand(0, 400); // initial delay before first bounty hunter check

  stars = Array.from({length:220},()=>({
    x:rand(0,canvas.width||390), y:rand(0,canvas.height||844),
    r:rand(0.3,1.6), o:rand(0.15,0.8), prl:rand(0.04,0.22),
  }));
}

