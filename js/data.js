// ── GAME DATA ────────────────────────────────────────────────────────────────
const WORLD = 3000;
const FACTION_COLORS = { federation:"#4a9eff", rebel:"#ff5a3c", pirate:"#ffb830", neutral:"#aaaaaa" };

const SYSTEMS = {
  sol:       { name:"Alpha Centauri", x:400,y:300, faction:"federation", desc:"Humanity's second home. Heavily patrolled.",     neighbors:["proxima","barnard","sirius"] },
  proxima:   { name:"Proxima",   x:260,y:220, faction:"federation", desc:"Quiet mining colony. Good fuel prices.",          neighbors:["sol","luyten","barnard"] },
  barnard:   { name:"Barnard",   x:310,y:420, faction:"federation", desc:"Agricultural world. Exports grain.",              neighbors:["sol","proxima","ross"] },
  sirius:    { name:"Sirius",    x:540,y:200, faction:"federation", desc:"Busy trade hub near the core.",                   neighbors:["sol","vega","altair"] },
  luyten:    { name:"Luyten",    x:130,y:170, faction:"rebel",      desc:"Rebel-controlled fringe.",                       neighbors:["proxima","wolf","epsilon"] },
  ross:      { name:"Ross",      x:200,y:500, faction:"rebel",      desc:"Rebel stronghold. Shipyards.",                   neighbors:["barnard","epsilon","kruger"] },
  vega:      { name:"Vega",      x:660,y:140, faction:"pirate",     desc:"Lawless. Pirates rule the lanes.",               neighbors:["sirius","altair","deneb"] },
  altair:    { name:"Altair",    x:620,y:320, faction:"federation", desc:"Military installation.",                         neighbors:["sirius","vega","fomalhaut"] },
  wolf:      { name:"Wolf",      x:60, y:290, faction:"pirate",     desc:"Deep fringe. Dangerous.",                        neighbors:["luyten","epsilon"] },
  epsilon:   { name:"Epsilon",   x:140,y:420, faction:"rebel",      desc:"Rebel supply depot.",                            neighbors:["luyten","ross","wolf"] },
  kruger:    { name:"Kruger",    x:280,y:600, faction:"neutral",    desc:"Independent. No questions asked.",               neighbors:["ross","fomalhaut"] },
  fomalhaut: { name:"Fomalhaut", x:500,y:520, faction:"neutral",    desc:"Free port. All factions.",                       neighbors:["altair","kruger","deneb"] },
  deneb:     { name:"Deneb",     x:720,y:420, faction:"pirate",     desc:"Pirate haven. Black Fleet home.",               neighbors:["vega","fomalhaut"] },
};

const SHIP_TYPES = {
  // Player starts with this - 100 hull, 30 shield, speed 3.2
  Shuttle:          { maxHull:100, maxShield:30,  speed:3.2, turnRate:0.07, thrust:0.18, color:"#4a9eff", size:14, damage:12 },
  Fighter:          { maxHull:55,  maxShield:20,  speed:2.9, turnRate:0.10, thrust:0.26, color:"#ff5a3c", size:12, damage:10 },
  Gunship:          { maxHull:110, maxShield:60,  speed:2.6, turnRate:0.06, thrust:0.18, color:"#4aff9a", size:16, damage:14 },
  // Centaurian ships — all slower than player (3.2), scaling down by class
  CentaurianFighter:{ maxHull:45,  maxShield:15,  speed:2.8, turnRate:0.11, thrust:0.26, color:"#4a9eff", size:22, drawSize:56,  sprite:"fighter", imgW:1024, imgH:1536, imgCx:510, imgCy:691,  damage:8  },
  CentaurianCruiser:{ maxHull:120, maxShield:50,  speed:2.2, turnRate:0.07, thrust:0.18, color:"#4a9eff", size:28, drawSize:80,  sprite:"cruiser", imgW:1024, imgH:1536, imgCx:511, imgCy:694,  damage:14 },
  CentaurianFrigate:{ maxHull:220, maxShield:100, speed:1.7, turnRate:0.05, thrust:0.14, color:"#4a9eff", size:36, drawSize:112, sprite:"frigate", imgW:1024, imgH:1536, imgCx:511, imgCy:767,  damage:20 },
  CentaurianCapital:{ maxHull:480, maxShield:200, speed:1.0, turnRate:0.02, thrust:0.08, color:"#4a9eff", size:55, drawSize:180, sprite:"capital", imgW:1024, imgH:1536, imgCx:511, imgCy:767,  damage:28 },
};

// Centaurian fleet spawn weights: [fighter, cruiser, frigate, capital]
// Heavier on fighters, capitals rare
const CENTAURIAN_FLEET = [
  { type:"CentaurianFighter", weight:50, label:"Centaurian Fighter",  bounty:[120,280] },
  { type:"CentaurianCruiser", weight:30, label:"Centaurian Cruiser",  bounty:[250,450] },
  { type:"CentaurianFrigate", weight:15, label:"Centaurian Frigate",  bounty:[400,700] },
  { type:"CentaurianCapital", weight:5,  label:"Centaurian Capital",  bounty:[800,1500] },
];

const ENEMY_CFGS = {
  pirate:     { label:"Pirate Raider", color:"#ffb830", shipType:"Fighter",  aggro:true  },
  rebel:      { label:"Rebel Patrol",  color:"#ff5a3c", shipType:"Fighter",  aggro:false },
  federation: { label:"Fed Patrol",    color:"#4a9eff", shipType:"Gunship",  aggro:false },
  neutral:    { label:"Trader",        color:"#aaaaaa", shipType:"Shuttle",  aggro:false },
};

// Asteroid sizes: radius, hp, collision damage, draw detail
const ASTEROID_SIZES = {
  small:  { r:14, hp:30,  damage:8  },
  medium: { r:28, hp:80,  damage:20 },
  large:  { r:50, hp:180, damage:40 },
};

function spawnAsteroid(x, y, size) {
  const cfg = ASTEROID_SIZES[size];
  const vmax = size==="large" ? 0.4 : size==="medium" ? 0.7 : 1.1;
  const id = mkid();
  const visualIdx = pickAsteroidVisualDef(size, id);
  const visDef = ASTEROID_VISUAL_DEFS[visualIdx];
  // Offscreen canvas sized to the asteroid's diameter + small margin
  const D = Math.ceil(cfg.r*2+4);
  const offCanvas = document.createElement('canvas');
  offCanvas.width = D; offCanvas.height = D;
  asteroids.push({
    id, x, y,
    vx:rand(-vmax,vmax), vy:rand(-vmax,vmax),
    angle:rand(0,Math.PI*2), spin:rand(-0.008,0.008),
    r:cfg.r, hp:cfg.hp, maxHp:cfg.hp,
    size, damage:cfg.damage,
    visualIdx, visDef,
    offCanvas,
    offCtx: offCanvas.getContext('2d'),
    rotY: rand(0, Math.PI*2), // current horizontal rotation
  });
}

