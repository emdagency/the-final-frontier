// ── TOUCH DEVICE DETECTION ────────────────────────────────────────────────────
// Show touch controls only on real touch devices
(function detectTouch() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch) document.body.classList.add('touch-device');
  // Also add class if user starts touching (covers hybrid laptops)
  window.addEventListener('touchstart', () => document.body.classList.add('touch-device'), {once:true, passive:true});
})();

document.addEventListener('keydown',    initAudio, { once: true });

// ── INPUT ─────────────────────────────────────────────────────────────────────
// LEFT joystick = rotate ship
// THRUST button = accelerate forward along ship heading
// BRAKE button  = retro-burn against current velocity
// FIRE button   = shoot
const input = { jx:0, jmag:0, thrusting:false, braking:false, firing:false };

// Joystick
const jZone = document.getElementById("joystick-zone");
const jBase = document.getElementById("joystick-base");
const jKnob = document.getElementById("joystick-knob");
let jTouch = null, jOrigin = {x:0, y:0};
const JR = 70;

jZone.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t = e.changedTouches[0];
  const r = jZone.getBoundingClientRect();
  jOrigin = {x:t.clientX, y:t.clientY};
  jBase.style.left = (t.clientX - r.left) + "px";
  jBase.style.top  = (t.clientY - r.top)  + "px";
  jBase.style.display = "block";
  jKnob.style.left = jKnob.style.top = "50%";
  jTouch = t.identifier;
  input.jx = input.jmag = 0;
}, {passive:false});

jZone.addEventListener("touchmove", e=>{
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== jTouch) continue;
    const dx = t.clientX - jOrigin.x, dy = t.clientY - jOrigin.y;
    const mag = Math.hypot(dx, dy);
    const cap = Math.min(mag, JR);
    const nx = mag > 0 ? dx/mag : 0;
    input.jx   = nx;
    input.jmag = cap / JR;
    jKnob.style.left = (50 + nx * cap/JR * 50) + "%";
    jKnob.style.top  = (50 + (mag>0?dy/mag:0) * cap/JR * 50) + "%";
  }
}, {passive:false});

const clearJoy = e=>{ e.preventDefault(); for (const t of e.changedTouches) if (t.identifier===jTouch) { jTouch=null; input.jx=input.jmag=0; jBase.style.display="none"; jKnob.style.left=jKnob.style.top="50%"; } };
jZone.addEventListener("touchend",   clearJoy, {passive:false});
jZone.addEventListener("touchcancel",clearJoy, {passive:false});

// Thrust / Brake / Fire buttons
function makeBtn(id, downKey, upKey) {
  const el = document.getElementById(id);
  el.addEventListener("touchstart", e=>{ e.preventDefault(); input[downKey]=true;  el.classList.add("active");    initAudio(); }, {passive:false});
  el.addEventListener("touchend",   e=>{ e.preventDefault(); input[downKey]=false; el.classList.remove("active"); }, {passive:false});
  el.addEventListener("touchcancel",e=>{ e.preventDefault(); input[downKey]=false; el.classList.remove("active"); }, {passive:false});
  el.addEventListener("mousedown",  ()=>{ input[downKey]=true;  el.classList.add("active");    initAudio(); });
  el.addEventListener("mouseup",    ()=>{ input[downKey]=false; el.classList.remove("active"); });
  el.addEventListener("mouseleave", ()=>{ input[downKey]=false; el.classList.remove("active"); });
  return el;
}
const thrustEl = makeBtn("thrustbutton", "thrusting");
const brakeEl  = makeBtn("brakebutton",  "braking");
const fireEl   = makeBtn("firebutton",   "firing");
// Fire uses "firing" class not "active"
fireEl.addEventListener("touchstart", ()=>fireEl.classList.add("firing"),    {passive:true});
fireEl.addEventListener("touchend",   ()=>fireEl.classList.remove("firing"), {passive:true});

// Keyboard
const keys = {};
const isTyping = () => document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
document.addEventListener("keydown", e=>{
  if (isTyping()) return;
  keys[e.key] = true;
  if ([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  if (e.key===" "||e.key==="z")              input.firing    = true;
  if (e.key==="ArrowUp"  ||e.key==="w")      input.thrusting = true;
  if (e.key==="ArrowDown"||e.key==="s")      input.braking   = true;
  if (e.key==="e"||e.key==="E")              { e.preventDefault(); dockShip(); }
});
document.addEventListener("keyup", e=>{
  if (isTyping()) return;
  keys[e.key] = false;
  if (e.key===" "||e.key==="z")              input.firing    = false;
  if (e.key==="ArrowUp"  ||e.key==="w")      input.thrusting = false;
  if (e.key==="ArrowDown"||e.key==="s")      input.braking   = false;
});

// ── EVENTS ───────────────────────────────────────────────────────────────────
function spawnExplosion(x, y, color, size=14) {
  const count = Math.floor(clamp(size * 2.5, 18, 80));
  const speed = clamp(size * 0.35, 2, 9);
  // Core flash particles
  for(let i=0;i<count;i++){
    const spd = rand(0.5, speed);
    const ang = rand(0, Math.PI*2);
    particles.push({
      x, y,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
      life: rand(30, 70), maxLife: 70,
      color: i < count*0.4 ? "#ffffff" : i < count*0.7 ? "#ffcc44" : color
    });
  }
  // Smoke puffs
  for(let i=0;i<Math.floor(count*0.4);i++){
    particles.push({
      x:x+rand(-size,size), y:y+rand(-size,size),
      vx:rand(-1,1), vy:rand(-1,1),
      life:rand(40,90), maxLife:90,
      color:"#445566"
    });
  }
}

function playExplosion(size=14) {
  if (!audioReady) return;
  const now = audioCtx.currentTime;
  const vol = clamp(size / 30, 0.15, 0.9);

  // Low boom
  const boom = audioCtx.createOscillator();
  const boomGain = audioCtx.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(120, now);
  boom.frequency.exponentialRampToValueAtTime(20, now + 0.4);
  boomGain.gain.setValueAtTime(vol * 1.2, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  boom.connect(boomGain); boomGain.connect(audioCtx.destination);
  boom.start(now); boom.stop(now + 0.5);

  // Noise crackle
  const bufSize = audioCtx.sampleRate * 0.4;
  const nBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for(let i=0;i<bufSize;i++) nd[i] = (Math.random()*2-1);
  const nSrc = audioCtx.createBufferSource();
  nSrc.buffer = nBuf;
  const nFilt = audioCtx.createBiquadFilter();
  nFilt.type = "bandpass"; nFilt.frequency.value = 300; nFilt.Q.value = 0.5;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(vol * 0.8, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  nSrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(audioCtx.destination);
  nSrc.start(now); nSrc.stop(now + 0.4);
}

function handleEnemyKill(e){
  state.kills++;
  // Reputation loss for killing faction ships (not pirates, who are already hostile)
  if (e.faction && e.faction !== "pirate") {
    const repLoss = e.shipType && e.shipType.includes("Capital") ? -15
                  : e.shipType && e.shipType.includes("Frigate") ? -10
                  : e.shipType && e.shipType.includes("Cruiser") ? -7
                  : -4;
    state.reputation[e.faction] = Math.max(-100, (state.reputation[e.faction]||0) + repLoss);
    const newRep = state.reputation[e.faction];
    if (newRep <= REP_ENEMY_THRESHOLD && newRep - repLoss > REP_ENEMY_THRESHOLD) {
      showToast(`🚨 ${e.faction.toUpperCase()} — ENEMY STATUS. Bounty hunters will pursue you.`);
    } else if (newRep <= REP_HOSTILE_THRESHOLD && newRep - repLoss > REP_HOSTILE_THRESHOLD) {
      showToast(`⚠ ${e.faction.toUpperCase()} REP CRITICAL — System ships will attack on sight.`);
    } else {
      showToast(`💥 ${e.label} DESTROYED  [Rep: ${e.faction} ${newRep}]`);
    }
  } else {
    showToast(`💥 ${e.label} DESTROYED`);
  }
  updateHUD();
  if (e.faction === "pirate") checkBountyCompletion("pirate");
}

function findNearestSafeSystem() {
  // Find nearest system where faction is friendly or neutral (rep > hostile threshold)
  // "safe" means: neutral faction OR federation/rebel/neutral with rep > REP_HOSTILE_THRESHOLD
  // Also accepts any system the player owns a station in
  let best = null, bestDist = Infinity;
  const sys = SYSTEMS[systemKey];
  // Build list of all systems reachable by graph distance
  // We use a simple all-systems scan weighted by graph hops + faction safety
  Object.entries(SYSTEMS).forEach(([sk, s]) => {
    const fac = s.faction;
    const rep = state.reputation[fac] || 0;
    const owned = state.ownedStations[sk];
    const isSafe = owned || fac === "neutral" || rep > REP_HOSTILE_THRESHOLD;
    if (!isSafe) return;
    // Use map coordinates as proxy for distance
    const dx = s.x - sys.x, dy = s.y - sys.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) { bestDist = d; best = sk; }
  });
  return best || "sol"; // fallback to sol
}

function handlePlayerDeath(){
  spawnExplosion(player.x, player.y, "#ff4444", 30);
  player.hull = Math.max(10, Math.floor(player.maxHull * 0.15));
  player.shield = 0;
  player.vx = 0; player.vy = 0;

  const safeKey = findNearestSafeSystem();
  const safeSys = SYSTEMS[safeKey];

  showToast(`💀 SHIP DESTROYED — Emergency jump to ${safeSys.name}`);

  setTimeout(() => {
    if (safeKey !== systemKey) {
      // Jump to safe system
      state.fuel = Math.max(0, state.fuel - 1);
      systemKey = safeKey;
      initWorld(safeKey);
      checkMissionCompletion(safeKey);
      refreshMissions(safeKey);
    }
    state.dockedAt = "station";
    updateHUD();
    enterDock();
  }, 1800);
}

function updateHUD(){
  document.getElementById("hud-credits").textContent=state.credits.toLocaleString()+" Cr";
  document.getElementById("hud-system").textContent=SYSTEMS[systemKey].name.toUpperCase();
  document.getElementById("hud-hull-val").textContent=`${player.hull}/${player.maxHull}`;
  document.getElementById("hud-shield-val").textContent=`${Math.floor(player.shield)}/${player.maxShield}`;
  document.getElementById("bar-hull").style.width=(player.hull/player.maxHull*100)+"%";
  document.getElementById("bar-shield").style.width=(player.shield/player.maxShield*100)+"%";
  // Rep status for current system faction
  const sysFac = SYSTEMS[systemKey].faction;
  const sysRep = state.reputation[sysFac] || 0;
  const repEl = document.getElementById("hud-rep-status");
  if (repEl) {
    let repTxt = "";
    let repColor = "#8899aa";
    if (sysRep <= REP_ENEMY_THRESHOLD) { repTxt=`⚠ ${sysFac.toUpperCase()} ENEMY`; repColor="#ff2222"; }
    else if (sysRep <= REP_HOSTILE_THRESHOLD) { repTxt=`✗ ${sysFac.toUpperCase()} HOSTILE`; repColor="#ff6644"; }
    else if (sysRep > 10) { repTxt=`✓ ${sysFac.toUpperCase()} FRIENDLY`; repColor="#4aff9a"; }
    const ownedCount = Object.keys(state.ownedStations).length;
    if (ownedCount > 0) repTxt += (repTxt?" · ":"") + `★ ${ownedCount} STN`;
    repEl.textContent = repTxt;
    repEl.style.color = repColor;
  }
}

let toastTimer=null;
function showToast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg; el.style.opacity="1";
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.style.opacity="0",2800);
}

