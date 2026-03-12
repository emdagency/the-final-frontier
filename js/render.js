// ── DRAW FUNCTIONS ────────────────────────────────────────────────────────────
function drawShipShape(c, x,y,angle,size,color,shield) {
  c.save(); c.translate(x,y); c.rotate(angle+Math.PI/2);
  if(shield>0){
    c.beginPath();c.arc(0,0,size*1.6,0,Math.PI*2);
    c.strokeStyle=`rgba(100,180,255,${clamp(shield/120,0,0.7)})`;c.lineWidth=2;c.stroke();
  }
  // Engine glow
  const eg=c.createRadialGradient(0,size*0.6,0,0,size*0.6,size*0.9);
  eg.addColorStop(0,"rgba(100,160,255,0.8)");eg.addColorStop(1,"rgba(0,0,0,0)");
  c.fillStyle=eg;c.beginPath();c.ellipse(0,size*0.55,size*0.28,size*0.45,0,0,Math.PI*2);c.fill();
  // Body
  c.beginPath();c.moveTo(0,-size);c.lineTo(size*0.58,size*0.65);c.lineTo(0,size*0.28);c.lineTo(-size*0.58,size*0.65);c.closePath();
  c.fillStyle="#0d1520";c.fill();c.strokeStyle=color;c.lineWidth=1.5;c.stroke();
  // Cockpit
  c.beginPath();c.ellipse(0,-size*0.18,size*0.2,size*0.3,0,0,Math.PI*2);
  c.fillStyle=color;c.globalAlpha=0.75;c.fill();c.globalAlpha=1;
  c.restore();
}

function drawCentaurianShip(c, x, y, angle, st, shield) {
  const img = centaurianImgs[st.sprite];
  if (!img || !img.complete || !img.naturalWidth) {
    drawShipShape(c, x, y, angle, st.size, st.color, shield);
    return;
  }
  const sc = st.drawSize / st.imgH;
  const drawW = st.imgW * sc, drawH = st.imgH * sc;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  if (shield > 0) {
    c.beginPath(); c.arc(0, 0, st.size * 1.8, 0, Math.PI*2);
    c.strokeStyle = `rgba(100,180,255,${clamp(shield/200,0,0.6)})`;
    c.lineWidth = 2; c.stroke();
  }
  c.drawImage(img, -st.imgCx*sc, -st.imgCy*sc, drawW, drawH);
  c.restore();
}

function drawPlayerShip(c, x, y, angle, thrustMag, tick) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);

  // Engine flames from nozzle positions defined in player.js
  if (thrustMag > 0.05 && typeof NOZZLES !== "undefined" && typeof FLAME_CFG !== "undefined") {
    NOZZLES.forEach((nz, i) => {
      // Safely read flame config — fall back to sensible defaults if keys differ
      const maxLen = FLAME_CFG.maxLen || FLAME_CFG.length || FLAME_CFG.max || 28;
      const width  = FLAME_CFG.width  || FLAME_CFG.w    || 6;
      const core   = FLAME_CFG.colorCore || FLAME_CFG.core || "#aaddff";
      const tip    = FLAME_CFG.colorTip  || FLAME_CFG.tip  || "rgba(0,80,255,0)";
      const flicker = 0.7 + 0.3 * Math.sin(tick * 0.4 + i * 1.3);
      const len = thrustMag * maxLen * flicker;
      if (!isFinite(len) || !isFinite(nz.x) || !isFinite(nz.y)) return;
      const grad = c.createLinearGradient(nz.x, nz.y, nz.x, nz.y + len);
      grad.addColorStop(0, core);
      grad.addColorStop(1, tip);
      c.beginPath();
      c.moveTo(nz.x - width / 2, nz.y);
      c.lineTo(nz.x + width / 2, nz.y);
      c.lineTo(nz.x, nz.y + len);
      c.closePath();
      c.fillStyle = grad;
      c.globalAlpha = 0.85 * flicker;
      c.fill();
      c.globalAlpha = 1;
    });
  }

  // Ship sprite with screen blend (black bg knocked out)
  // Rendered at 2x then scaled down — gives sharper detail at same visible size
  if (shipSprite.complete && shipSprite.naturalWidth) {
    c.save();
    c.scale(0.5, 0.5);
    c.globalCompositeOperation = "screen";
    c.drawImage(shipSprite, -SHIP_RENDER_W, -SHIP_RENDER_H, SHIP_RENDER_W * 2, SHIP_RENDER_H * 2);
    c.globalCompositeOperation = "source-over";
    c.restore();
  } else {
    // Fallback vector shape if sprite hasn't loaded
    drawShipShape(c, 0, 0, 0, 18, "#4af", player.shield);
  }

  c.restore();
}

function drawPlanet(c,x,y,r,color) {
  // Atmosphere glow
  const g=c.createRadialGradient(x,y,r*0.7,x,y,r*1.8);
  g.addColorStop(0,"rgba(80,180,160,0.12)");g.addColorStop(1,"transparent");
  c.fillStyle=g;c.beginPath();c.arc(x,y,r*1.8,0,Math.PI*2);c.fill();
  // Sprite if in Sol system, else procedural
  if (systemKey==="sol" && planetSprite.complete && planetSprite.naturalWidth) {
    c.save();
    c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.clip();
    c.drawImage(planetSprite, x-r, y-r, r*2, r*2);
    const ld=c.createRadialGradient(x,y,r*0.4,x,y,r);
    ld.addColorStop(0,"transparent");ld.addColorStop(1,"rgba(0,5,15,0.55)");
    c.fillStyle=ld;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    c.restore();
  } else {
    const b=c.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r);
    b.addColorStop(0,color+"bb");b.addColorStop(1,"#050a0f");
    c.fillStyle=b;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    c.strokeStyle=color+"66";c.lineWidth=1;c.stroke();
  }
}

function drawStationShape(c,x,y,color,stObj) {
  const owned = stObj && stObj.owned;
  const drawColor = owned ? "#4aff9a" : color;
  if (systemKey==="sol" && stationSprite.complete && stationSprite.naturalWidth && !owned) {
    const sw = 120, sh = 180;
    c.save();
    c.translate(x, y);
    c.drawImage(stationSprite, -sw/2, -sh/2, sw, sh);
    // Subtle dock indicator dot
    c.beginPath();c.arc(0,0,4,0,Math.PI*2);
    c.fillStyle=drawColor;c.fill();
    c.restore();
  } else {
    c.save();c.translate(x,y);
    // Ownership tint
    if (owned) {
      c.shadowColor="#4aff9a"; c.shadowBlur=18;
    }
    c.beginPath();c.arc(0,0,26,0,Math.PI*2);c.strokeStyle=drawColor+"88";c.lineWidth=2;c.stroke();
    for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.strokeStyle=drawColor+"55";c.lineWidth=1.5;c.beginPath();c.moveTo(0,7);c.lineTo(0,24);c.stroke();c.restore();}
    c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fillStyle="#0d1520";c.fill();c.strokeStyle=drawColor;c.lineWidth=1.5;c.stroke();
    c.beginPath();c.arc(0,0,2.5,0,Math.PI*2);c.fillStyle=drawColor;c.fill();
    c.shadowBlur=0;
    c.restore();
  }

  // Health & shield bars above station
  if (stObj) {
    const bw = 60;
    const bx = x - bw/2;
    // Hull bar
    const hullFrac = stObj.hull / stObj.maxHull;
    const hullColor = hullFrac > 0.5 ? "#4aff4a" : hullFrac > 0.25 ? "#ffcc44" : "#ff4444";
    c.fillStyle="#0a1a0a"; c.fillRect(bx, y-48, bw, 4);
    c.fillStyle=hullColor;  c.fillRect(bx, y-48, bw*hullFrac, 4);
    // Shield bar (if any)
    if (stObj.maxShield > 0) {
      const shFrac = stObj.shield / stObj.maxShield;
      c.fillStyle="#0a1020"; c.fillRect(bx, y-54, bw, 3);
      c.fillStyle=`rgba(100,180,255,0.85)`; c.fillRect(bx, y-54, bw*shFrac, 3);
    }
    // Owned label / faction label
    if (owned) {
      c.fillStyle="#4aff9a"; c.font="bold 8px 'Courier New'"; c.textAlign="center";
      c.fillText("★ YOURS", x, y-58);
    } else {
      // Show under-attack indicator if hull < max
      if (stObj.hull < stObj.maxHull) {
        c.fillStyle="#ff4444"; c.font="bold 8px 'Courier New'"; c.textAlign="center";
        c.fillText("UNDER ATTACK", x, y-60);
      }
    }
  }
}

// ── 3D ASTEROID RENDERING SYSTEM ─────────────────────────────────────────────
// Ported from standalone asteroid renderer — pre-bakes a texture per asteroid
// then raycasts it each frame for a realistic lit 3D sphere look.

function PRNG(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s^=s<<13; s^=s>>>17; s^=s<<5; return((s>>>0)/0xFFFFFFFF); };
}

function makeNoise3D(seed) {
  const SIZE=64,S2=SIZE*SIZE,S3=SIZE*SIZE*SIZE;
  const rng=PRNG(seed);
  const table=new Float32Array(S3);
  for(let i=0;i<S3;i++) table[i]=rng()*2-1;
  function fade(t){return t*t*t*(t*(t*6-15)+10);}
  return (x,y,z)=>{
    const ix=Math.floor(x)|0,iy=Math.floor(y)|0,iz=Math.floor(z)|0;
    const fx=x-ix,fy=y-iy,fz=z-iz;
    const ux=fade(fx),uy=fade(fy),uz=fade(fz);
    const g=(ax,ay,az)=>table[((ax&(SIZE-1))*S2+(ay&(SIZE-1))*SIZE+(az&(SIZE-1)))|0];
    const x0y0=g(ix,iy,iz)*(1-ux)+g(ix+1,iy,iz)*ux;
    const x1y0=g(ix,iy+1,iz)*(1-ux)+g(ix+1,iy+1,iz)*ux;
    const x0y1=g(ix,iy,iz+1)*(1-ux)+g(ix+1,iy,iz+1)*ux;
    const x1y1=g(ix,iy+1,iz+1)*(1-ux)+g(ix+1,iy+1,iz+1)*ux;
    return(x0y0*(1-uy)+x1y0*uy)*(1-uz)+(x0y1*(1-uy)+x1y1*uy)*uz;
  };
}

function fbm(noise,x,y,z,oct){
  let v=0,a=0.5,f=1;
  for(let i=0;i<oct;i++){v+=noise(x*f,y*f,z*f)*a;a*=0.52;f*=2.1;}
  return v;
}

function buildAsteroidTexture(cfg,TW,TH){
  const n1=makeNoise3D(cfg.seed),n2=makeNoise3D(cfg.seed+9001),n3=makeNoise3D(cfg.seed+12345);
  const crng=PRNG(cfg.seed+777);
  const craters=[];
  for(let c=0;c<cfg.numCraters;c++){
    const theta=crng()*Math.PI*2,phi=Math.acos(2*crng()-1);
    craters.push({nx:Math.sin(phi)*Math.cos(theta),ny:Math.sin(phi)*Math.sin(theta),nz:Math.cos(phi),
      r:0.08+crng()*0.18*cfg.craterScale,depth:0.5+crng()*0.5});
  }
  const buf=new Uint8ClampedArray(TW*TH*4);
  for(let row=0;row<TH;row++){
    const phi=(row/(TH-1))*Math.PI,sinP=Math.sin(phi),cosP=Math.cos(phi);
    for(let col=0;col<TW;col++){
      const theta=(col/(TW-1))*Math.PI*2;
      const sx=sinP*Math.cos(theta),sy=sinP*Math.sin(theta),sz=cosP;
      const rock=fbm(n1,sx*2.5+5,sy*2.5+5,sz*2.5+5,8);
      const rock2=fbm(n2,sx*4+15,sy*4+15,sz*4+15,5);
      const rock3=fbm(n3,sx*1.2+25,sy*1.2+25,sz*1.2+25,4);
      let crH=0,rimH=0;
      for(const cr of craters){
        const dot=sx*cr.nx+sy*cr.ny+sz*cr.nz;
        const ang=Math.acos(Math.max(-1,Math.min(1,dot)));
        const t=ang/cr.r;
        if(t<1.0){const bowl=Math.cos(t*Math.PI*0.5);crH-=bowl*bowl*cr.depth*0.55;}
        else if(t<1.35){const r=(1-(t-1)/0.35);rimH+=r*r*cr.depth*0.35;}
      }
      const height=rock*0.5+rock2*0.3+rock3*0.12+crH+rimH*0.6;
      const[br,bg,bb]=cfg.baseColor,[dr,dg,db]=cfg.darkColor,[lr,lg,lb]=cfg.lightColor;
      const t=Math.max(0,Math.min(1,height*0.8+0.5));
      let r,g,b;
      if(t<0.5){const tt=t*2;r=dr+(br-dr)*tt;g=dg+(bg-dg)*tt;b=db+(bb-db)*tt;}
      else{const tt=(t-0.5)*2;r=br+(lr-br)*tt;g=bg+(lg-bg)*tt;b=bb+(lb-bb)*tt;}
      r=Math.min(255,r+rimH*60);g=Math.min(255,g+rimH*55);b=Math.min(255,b+rimH*45);
      const i=(row*TW+col)*4;
      buf[i]=Math.max(0,Math.min(255,r));buf[i+1]=Math.max(0,Math.min(255,g));
      buf[i+2]=Math.max(0,Math.min(255,b));buf[i+3]=Math.max(0,Math.min(255,(height*0.5+0.5)*255));
    }
  }
  return buf;
}

// Asteroid visual configs — two variants per size so the field has variety
const ASTEROID_VISUAL_DEFS = [
  // C-type (dark, heavily cratered) — used for large
  {seed:1001,baseColor:[84,80,75],darkColor:[36,32,28],lightColor:[128,122,114],numCraters:16,craterScale:1.1,roughness:2.0,specularity:0.35,tiltX:0.38},
  // S-type (slightly brighter, fewer craters) — used for large alt
  {seed:2002,baseColor:[100,92,80],darkColor:[52,46,36],lightColor:[148,138,120],numCraters:10,craterScale:1.25,roughness:1.5,specularity:0.65,tiltX:0.22},
  // M-type (bluish metallic) — used for medium
  {seed:3003,baseColor:[74,80,96],darkColor:[36,40,54],lightColor:[110,118,142],numCraters:7,craterScale:0.85,roughness:1.1,specularity:1.5,tiltX:-0.28},
  // Rubble (rough, many craters) — used for medium alt
  {seed:4004,baseColor:[80,76,70],darkColor:[38,34,30],lightColor:[116,110,102],numCraters:22,craterScale:0.70,roughness:2.5,specularity:0.25,tiltX:0.55},
  // Chondrite (smooth, large craters) — used for small
  {seed:5005,baseColor:[72,74,82],darkColor:[34,36,46],lightColor:[106,110,126],numCraters:8,craterScale:1.40,roughness:0.95,specularity:0.80,tiltX:0.15},
  // Pebble (small, rough) — used for small alt
  {seed:6006,baseColor:[88,84,78],darkColor:[44,40,36],lightColor:[128,122,114],numCraters:13,craterScale:0.95,roughness:1.8,specularity:0.40,tiltX:-0.45},
];

// Pre-bake textures once at startup (expensive but done only once)
const AST_TW=256, AST_TH=128;
const _astTexCache = ASTEROID_VISUAL_DEFS.map(def => buildAsteroidTexture(def, AST_TW, AST_TH));

// Render a single 3D asteroid frame onto a canvas context at (cx,cy) with radius R
function renderAsteroid3D(ctx, tex, R, rotY, rotX, roughness, specularity, damaged, hpFrac) {
  const D = Math.ceil(R*2+2);
  const img = ctx.createImageData(D, D);
  const out = img.data;
  const ocx = R+1, ocy = R+1;
  const INV_R = 1/R;
  const LX=-0.50,LY=-0.65,LZ=0.57,ll=Math.sqrt(LX*LX+LY*LY+LZ*LZ);
  const lx=LX/ll,ly=LY/ll,lz=LZ/ll;
  const cy=Math.cos(rotY),sy=Math.sin(rotY),cx2=Math.cos(rotX),sx2=Math.sin(rotX);
  const icy=Math.cos(-rotY),isy=Math.sin(-rotY),icx=Math.cos(-rotX),isx=Math.sin(-rotX);
  const BUMP=4.5*roughness;
  const TW=AST_TW, TH=AST_TH;
  function samp(row,col){const r=Math.max(0,Math.min(TH-1,row|0));const c=((col|0)%TW+TW)%TW;return(r*TW+c)*4;}
  for(let py=0;py<D;py++){
    const dy=(py-ocy)*INV_R,dy2=dy*dy;
    if(dy2>1.05)continue;
    for(let px=0;px<D;px++){
      const dx=(px-ocx)*INV_R,d2=dx*dx+dy2;
      if(d2>1.0)continue;
      const dz=Math.sqrt(1.0-d2);
      let tx0=cy*dx-sy*dz,ty0=dy,tz0=sy*dx+cy*dz;
      let tx1=tx0,ty1=cx2*ty0-sx2*tz0,tz1=sx2*ty0+cx2*tz0;
      const theta=Math.atan2(ty1,tx1),phi=Math.acos(Math.max(-1,Math.min(1,tz1)));
      const u=((theta/(Math.PI*2))+0.5),v=phi/Math.PI;
      const tc=u*(TW-1),tr=v*(TH-1),tci=tc|0,tri=tr|0,tfx=tc-tci,tfy=tr-tri;
      const i00=samp(tri,tci),i10=samp(tri,tci+1),i01=samp(tri+1,tci),i11=samp(tri+1,tci+1);
      function bl(ch){return(tex[i00+ch]*(1-tfx)+tex[i10+ch]*tfx)*(1-tfy)+(tex[i01+ch]*(1-tfx)+tex[i11+ch]*tfx)*tfy;}
      const cr=bl(0),cg=bl(1),cb=bl(2),ch=bl(3);
      const iU=samp(tri,(tci+1)%TW),iV=samp(Math.min(TH-1,tri+1),tci);
      const dhu=(tex[iU+3]-ch)/255*BUMP,dhv=(tex[iV+3]-ch)/255*BUMP;
      const sinPhi=Math.sin(phi),cosPhi=Math.cos(phi),sinT=Math.sin(theta),cosT=Math.cos(theta);
      const tgUx=-sinT,tgUy=cosT,tgUz=0;
      const tgVx=cosPhi*cosT,tgVy=cosPhi*sinT,tgVz=-sinPhi;
      let bnx=tx1+dhu*tgUx+dhv*tgVx,bny=ty1+dhu*tgUy+dhv*tgVy,bnz=tz1+dhu*tgUz+dhv*tgVz;
      const bnl=Math.sqrt(bnx*bnx+bny*bny+bnz*bnz);bnx/=bnl;bny/=bnl;bnz/=bnl;
      let wx0=bnx,wy0=icx*bny-isx*bnz,wz0=isx*bny+icx*bnz;
      let wx1=icy*wx0-isy*wz0,wy1=wy0,wz1=isy*wx0+icy*wz0;
      const diff=Math.max(0,wx1*lx+wy1*ly+wz1*lz);
      const rdz=2*(wx1*lx+wy1*ly+wz1*lz)*wz1-lz;
      const spec=Math.pow(Math.max(0,-rdz),32)*specularity*0.45;
      const ao=Math.pow(dz,0.35)*0.75+0.25;
      const light=(0.055+diff*0.945)*ao;
      // Damage tint: shift toward orange-red when heavily damaged
      const dmgTint = damaged ? (1-hpFrac)*0.55 : 0;
      const oi=(py*D+px)*4;
      out[oi]  =Math.max(0,Math.min(255, cr*light+spec*255 + dmgTint*120));
      out[oi+1]=Math.max(0,Math.min(255, cg*light+spec*245 - dmgTint*30));
      out[oi+2]=Math.max(0,Math.min(255, cb*light+spec*230 - dmgTint*60));
      out[oi+3]=255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Assign a visual def index to each size — large gets C/S-type, medium M/Rubble, small Chondrite/Pebble
function pickAsteroidVisualDef(size, seed) {
  if(size==="large")  return (seed%2===0) ? 0 : 1;
  if(size==="medium") return (seed%2===0) ? 2 : 3;
  return (seed%2===0) ? 4 : 5;
}

// ── MISSION SYSTEM ───────────────────────────────────────────────────────────
const MISSION_TEMPLATES = [
  // Transport passengers
  { type:"passenger", icon:"🧑‍🚀", title:"Passenger Transport",
    desc:(from,to,pay)=>`Carry ${rand(1,5)|0} passenger${rand(1,5)|0>1?"s":""} from ${SYSTEMS[from].name} to ${SYSTEMS[to].name}.`,
    payRange:[800,2200], legal:true },
  // Cargo delivery
  { type:"cargo", icon:"📦", title:"Cargo Delivery",
    desc:(from,to,pay)=>`Deliver medical supplies from ${SYSTEMS[from].name} to ${SYSTEMS[to].name}.`,
    payRange:[600,1800], legal:true },
  // Smuggling
  { type:"smuggle", icon:"🚫", title:"Contraband Run",
    desc:(from,to,pay)=>`Smuggle restricted goods to ${SYSTEMS[to].name}. Don't attract attention.`,
    payRange:[1500,4000], legal:false },
  // Bounty hunt
  { type:"bounty", icon:"🎯", title:"Bounty Contract",
    desc:(from,to,pay)=>`Eliminate a pirate wanted in ${SYSTEMS[to].name} space. Bring proof.`,
    payRange:[1200,3000], legal:true },
  // Scout mission
  { type:"scout", icon:"🔭", title:"Survey Mission",
    desc:(from,to,pay)=>`Survey the asteroid belt near ${SYSTEMS[to].name} and return data.`,
    payRange:[500,1200], legal:true },
  // Rescue
  { type:"rescue", icon:"🆘", title:"Rescue Operation",
    desc:(from,to,pay)=>`Locate a distress beacon near ${SYSTEMS[to].name} and escort the vessel back.`,
    payRange:[900,2400], legal:true },
];

function generateMissions(locationKey) {
  const sys = SYSTEMS[locationKey];
  const neighbors = sys.neighbors;
  const missions = [];
  const count = 3 + (Math.random() < 0.4 ? 1 : 0); // 3–4 missions
  for (let i = 0; i < count; i++) {
    const tpl = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
    // Pick a random neighbour as destination
    const destKey = neighbors[Math.floor(Math.random() * neighbors.length)];
    const [pMin, pMax] = tpl.payRange;
    const pay = Math.floor(rand(pMin, pMax) / 50) * 50; // round to 50
    const timeLimit = tpl.type === "bounty" ? null : (8 + Math.floor(Math.random()*6)); // jumps remaining
    missions.push({
      id: mkid(),
      type: tpl.type,
      icon: tpl.icon,
      title: tpl.title,
      desc: tpl.desc(locationKey, destKey, pay),
      originKey: locationKey,
      destKey,
      pay,
      timeLimit,
      legal: tpl.legal,
      status: "available", // available | active | complete | failed
    });
  }
  return missions;
}

// Generate missions when entering a new system or docking
function refreshMissions(locationKey) {
  state.missions = generateMissions(locationKey);
}

function acceptMission(missionId) {
  if (state.activeMission) return; // already have one
  const m = state.missions.find(m => m.id === missionId);
  if (!m || m.status !== "available") return;
  m.status = "active";
  state.activeMission = m;
  showToast(`✅ Mission accepted: ${m.title}`);
  renderDockScreen();
}

function checkMissionCompletion(arrivalKey) {
  const m = state.activeMission;
  if (!m || m.status !== "active") return;
  if (arrivalKey === m.destKey && (m.type === "passenger" || m.type === "cargo" || m.type === "smuggle" || m.type === "scout" || m.type === "rescue")) {
    // Deliver on dock
    m.status = "complete";
    state.credits += m.pay;
    state.activeMission = null;
    if (m.type === "smuggle") state.reputation.pirate = Math.min(100, (state.reputation.pirate||0) + 5);
    else state.reputation.federation = Math.min(100, (state.reputation.federation||0) + 3);
    updateHUD();
    showToast(`🎉 Mission complete! +${m.pay.toLocaleString()} Cr`);
  }
}

function checkBountyCompletion(killedFaction) {
  const m = state.activeMission;
  if (!m || m.status !== "active" || m.type !== "bounty") return;
  if (killedFaction === "pirate") {
    m.status = "complete";
    state.credits += m.pay;
    state.activeMission = null;
    state.reputation.federation = Math.min(100, (state.reputation.federation||0) + 4);
    updateHUD();
    showToast(`🎯 Bounty collected! +${m.pay.toLocaleString()} Cr`);
  }
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
let lastTime=0;
let engineTick=0;

function tick(now) {
  const dt = Math.min((now-lastTime)/16.67,3);
  lastTime=now;

  // Shield regen — recharges in flight: full recharge in ~10 seconds
  if(player.shield<player.maxShield&&player.hull>0){
    player.shield=Math.min(player.maxShield,player.shield+(player.maxShield/600)*dt);
    updateHUD();
  }

  if(gameMode!=="flight"){requestAnimationFrame(tick);return;}

  const W2=canvas.width, H2=canvas.height;

  // ── Player physics ──────────────────────────────────────────────────────────
  // Joystick left/right = rotate ship heading
  // THRUST = accelerate along heading   BRAKE = retro-burn   FIRE = shoot
  // Keyboard: A/D or ←/→ = rotate, W/↑ = thrust, S/↓ = brake, Space = fire

  // Rotation
  const rotInput = input.jmag > 0.05 ? input.jx
    : (keys["ArrowLeft"] ||keys["a"]) ? -1
    : (keys["ArrowRight"]||keys["d"]) ?  1 : 0;
  if (Math.abs(rotInput) > 0.05)
    player.angle += rotInput * player.turnRate * dt * (input.jmag ? 3.5 * Math.max(0.4, input.jmag) : 1.35);

  // Heading unit vector
  const hx = Math.cos(player.angle - Math.PI/2);
  const hy = Math.sin(player.angle - Math.PI/2);

  let thrustMag = 0;

  // Forward thrust
  if (input.thrusting) {
    player.vx += hx * player.thrust * dt;
    player.vy += hy * player.thrust * dt;
    thrustMag = 1;
  }

  // Brake: retro-burn against velocity
  const braking = input.braking;
  if (braking) {
    const spd0 = Math.hypot(player.vx, player.vy);
    if (spd0 > 0.05) {
      player.vx -= (player.vx / spd0) * player.thrust * 1.2 * dt;
      player.vy -= (player.vy / spd0) * player.thrust * 1.2 * dt;
      if (Math.hypot(player.vx, player.vy) > spd0) { player.vx = 0; player.vy = 0; }
    }
    thrustMag = Math.max(thrustMag, 0.4);
  }

  // Very light drag + speed cap
  player.vx *= Math.pow(0.998, dt);
  player.vy *= Math.pow(0.998, dt);
  const spd = Math.hypot(player.vx, player.vy);
  if (spd > player.speed) { player.vx = player.vx/spd*player.speed; player.vy = player.vy/spd*player.speed; }
  player.x = clamp(player.x + player.vx*dt, 60, WORLD-60);
  player.y = clamp(player.y + player.vy*dt, 60, WORLD-60);

  // Shoot
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  if ((input.firing || keys[" "]) && player.shootCooldown <= 0) {
    player.shootCooldown = 10;
    playLaser();
    bullets.push({ id:mkid(), x:player.x, y:player.y,
      vx: hx*13 + player.vx, vy: hy*13 + player.vy,
      life:55, owner:"player", color:"#00ffdd" });
  }

  // Enemies
  enemies.forEach(e=>{
    if(e.hull<=0) return;
    const d2=dist2(e,player);

    if(e.hostile) {
      const ta=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2;
      let da=ta-e.angle; while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
      e.angle+=Math.sign(da)*Math.min(Math.abs(da),e.turnRate*dt);
      if(d2>200*200){e.vx+=Math.cos(e.angle-Math.PI/2)*e.thrust*dt;e.vy+=Math.sin(e.angle-Math.PI/2)*e.thrust*dt;}

      // Spread-shot burst — wider/denser for bigger ships
      e.shootCooldown=Math.max(0,e.shootCooldown-dt);
      if(d2<520*520&&e.shootCooldown<=0){
        const isCapital = e.shipType.includes("Capital");
        const isFrigate = e.shipType.includes("Frigate");
        const isCruiser = e.shipType.includes("Cruiser");
        const numShots = isCapital ? 5 : isFrigate ? 4 : isCruiser ? 3 : 2;
        const spread   = isCapital ? 0.32 : isFrigate ? 0.25 : isCruiser ? 0.18 : 0.12;
        const cd       = isCapital ? 70 : isFrigate ? 58 : isCruiser ? 45 : 36;  // longer cooldowns = more dodgeable
        const bspd     = isCapital ? 7.5 : isFrigate ? 8 : isCruiser ? 8.5 : 9; // slower bullets
        e.shootCooldown = cd + rand(-5, 12);

        // Reduced lead-aim (0.2 instead of 0.35) — gives player better chance to dodge
        const travelT = Math.sqrt(d2) / bspd;
        const leadX = player.x + player.vx * travelT * 0.2;
        const leadY = player.y + player.vy * travelT * 0.2;
        const aimBase = Math.atan2(leadY - e.y, leadX - e.x);

        for(let i=0; i<numShots; i++){
          const offset = numShots===1 ? 0 : (i/(numShots-1) - 0.5)*2*spread;
          bullets.push({id:mkid(), x:e.x, y:e.y,
            vx:Math.cos(aimBase+offset)*bspd,
            vy:Math.sin(aimBase+offset)*bspd,
            life:65, owner:e.id, color:"#ff4422",
            damage: SHIP_TYPES[e.shipType]?.damage || 10});
        }
      }
    } else {
      e.angle += (Math.random()-0.5)*0.03*dt;
      e.vx += Math.cos(e.angle-Math.PI/2)*e.thrust*0.15*dt;
      e.vy += Math.sin(e.angle-Math.PI/2)*e.thrust*0.15*dt;
    }
    e.vx*=Math.pow(0.985,dt);e.vy*=Math.pow(0.985,dt);
    const es=Math.hypot(e.vx,e.vy);if(es>e.speed){e.vx=e.vx/es*e.speed;e.vy=e.vy/es*e.speed;}
    const ex_new = e.x + e.vx*dt;
    const ey_new = e.y + e.vy*dt;
    const MARGIN = 120;
    if (ex_new < MARGIN || ex_new > WORLD-MARGIN || ey_new < MARGIN || ey_new > WORLD-MARGIN) {
      // Turn toward centre with a random offset so they scatter, not pile up
      const toCentreAngle = Math.atan2(WORLD/2 - e.y, WORLD/2 - e.x);
      e.angle = toCentreAngle + Math.PI/2 + rand(-0.8, 0.8);
      e.vx = Math.cos(e.angle - Math.PI/2) * e.speed * 0.6;
      e.vy = Math.sin(e.angle - Math.PI/2) * e.speed * 0.6;
    }
    e.x = clamp(e.x+e.vx*dt, 60, WORLD-60);
    e.y = clamp(e.y+e.vy*dt, 60, WORLD-60);
    if(e.shield<e.maxShield) e.shield=Math.min(e.maxShield,e.shield+0.008*dt);
  });

  // Bullets
  bullets=bullets.filter(b=>b.life>0);
  bullets.forEach(b=>{
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    // Enemy bullet hits player
    if(b.owner!=="player"&&dist2(b,player)<18*18){
      b.life=0;
      const dmg = b.damage || 10;
      if(player.shield>0){player.shield=Math.max(0,player.shield-dmg);}
      else{player.hull=Math.max(0,player.hull-dmg);}
      updateHUD();
      if(player.hull<=0){handlePlayerDeath();}
    }
    // Player bullet hits enemy
    if(b.owner==="player"){
      enemies.forEach(e=>{
        if(e.hull<=0)return;
        const st=SHIP_TYPES[e.shipType||"Fighter"];
        // Use drawSize/2 for Centaurian ships (sprite-based) so hitbox matches the visual
        const hitR = st.drawSize ? st.drawSize * 0.45 : st.size + 10;
        if(dist2(b,e)<hitR*hitR){
          b.life=0;
          // Player deals 28 damage — excess shield damage carries over to hull
          if(e.shield>0){
            const shieldDmg=Math.min(e.shield,28);
            e.shield-=shieldDmg;
            const overflow=28-shieldDmg;
            if(overflow>0) e.hull=Math.max(0,e.hull-overflow);
          } else { e.hull=Math.max(0,e.hull-32); }
          if(!e.hostile){
            e.hostile=true;
            // Reputation penalty for attacking faction ships
            if (e.faction && e.faction !== "pirate") {
              const repLoss = -3;
              state.reputation[e.faction] = Math.max(-100, (state.reputation[e.faction]||0) + repLoss);
            }
            enemies.forEach(n=>{
              if(n.id!==e.id && !n.hostile && n.faction===e.faction && dist2(n,e)<800*800)
                n.hostile=true;
            });
            showToast(`⚠ ${e.label} HOSTILE — ${e.faction ? e.faction.toUpperCase()+' REP: '+(state.reputation[e.faction]||0) : ''}`);
          }
          if(e.hull<=0){
            spawnExplosion(e.x,e.y,e.color,st.size);
            playExplosion(st.size);
            handleEnemyKill(e);
          }
        }
      });
    }
    // Bullet hits asteroid
    if(b.life>0){
      asteroids.forEach(a=>{
        if(a.hp<=0)return;
        if(dist2(b,a)<a.r*a.r){
          b.life=0;
          a.hp-=20;
          // Chip particles
          for(let i=0;i<5;i++) particles.push({x:b.x,y:b.y,vx:rand(-2,2),vy:rand(-2,2),life:18,maxLife:18,color:"#aaaaaa"});
          if(a.hp<=0){
            spawnExplosion(a.x,a.y,"#888888",a.r);
            playExplosion(a.r*0.5);
            // Large asteroid splits into smaller ones
            if(a.size==="large"){
              for(let i=0;i<2;i++) spawnAsteroid(a.x+rand(-40,40),a.y+rand(-40,40),"medium");
            } else if(a.size==="medium"){
              for(let i=0;i<2;i++) spawnAsteroid(a.x+rand(-20,20),a.y+rand(-20,20),"small");
            }
          }
        }
      });
    }
  });

  // Particles
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=0.95;p.vy*=0.95;});
  particles=particles.filter(p=>p.life>0);

  // Asteroids
  asteroids=asteroids.filter(a=>a.hp>0);
  asteroids.forEach(a=>{
    a.x = clamp(a.x+a.vx*dt, 100, WORLD-100);
    a.y = clamp(a.y+a.vy*dt, 100, WORLD-100);
    // Bounce off world edges
    if(a.x<=100||a.x>=WORLD-100) a.vx*=-1;
    if(a.y<=100||a.y>=WORLD-100) a.vy*=-1;
    a.angle += a.spin*dt;
    // Player collision
    const pd = Math.hypot(player.x-a.x, player.y-a.y);
    if(pd < a.r + 12) {
      // nx/ny points FROM asteroid centre TOWARD player
      const nx=(player.x-a.x)/pd, ny=(player.y-a.y)/pd;
      // Positionally separate both objects to prevent sticking
      const overlap = (a.r + 12) - pd + 1;
      player.x += nx * overlap * 0.6;
      player.y += ny * overlap * 0.6;
      a.x      -= nx * overlap * 0.4;
      a.y      -= ny * overlap * 0.4;
      // Bounce velocities
      player.vx = nx * player.speed * 0.75;
      player.vy = ny * player.speed * 0.75;
      a.vx -= nx * 0.6; a.vy -= ny * 0.6;
      // Only deal damage once per collision (cooldown prevents per-frame spam)
      if(!a.hitCooldown || a.hitCooldown <= 0) {
        const dmg = a.damage;
        if(player.shield>0){player.shield=Math.max(0,player.shield-dmg);}
        else{player.hull=Math.max(0,player.hull-dmg);}
        updateHUD();
        showToast(`⚠ ASTEROID IMPACT — ${dmg} DMG`);
        if(player.hull<=0) handlePlayerDeath();
        a.hitCooldown = 45; // ~0.75s grace period before it can hurt again
      }
    }
    if(a.hitCooldown > 0) a.hitCooldown -= dt;
  });

  // ── STATION COMBAT ────────────────────────────────────────────────────────────
  // Player bullets hitting station
  if (!station.owned && station.hull > 0) {
    bullets.forEach(b => {
      if (b.owner !== "player" || b.life <= 0) return;
      const stDist = Math.hypot(b.x - station.x, b.y - station.y);
      if (stDist < 38) {
        b.life = 0;
        // Shields absorb first
        if (station.shield > 0) {
          const shDmg = Math.min(station.shield, 28);
          station.shield -= shDmg;
          const overflow = 28 - shDmg;
          if (overflow > 0) station.hull = Math.max(0, station.hull - overflow);
        } else {
          station.hull = Math.max(0, station.hull - 32);
        }
        // Rep loss for attacking station
        const sysFaction = SYSTEMS[systemKey].faction;
        state.reputation[sysFaction] = Math.max(-100, (state.reputation[sysFaction]||0) - 5);
        // Station fires back!
        station.shootCooldown = Math.max(0, (station.shootCooldown||0) - dt);
        // Make all system ships hostile
        enemies.forEach(e => { if (e.faction === sysFaction || e.faction === "centaurian") e.hostile = true; });
        spawnExplosion(b.x, b.y, "#ffcc44", 6);
        if (station.hull <= 0) {
          // Station taken over!
          station.owned = true;
          station.hull = 200;
          station.maxHull = 800;
          station.shield = 0;
          station.maxShield = 0;
          station.color = "#4aff9a";
          state.ownedStations[systemKey] = true;
          spawnExplosion(station.x, station.y, "#4aff9a", 40);
          showToast(`🏴 STATION CAPTURED! Tribute payments started.`);
        }
      }
    });
    // Station shield regen
    if (station.shield < station.maxShield) station.shield = Math.min(station.maxShield, station.shield + 0.005*dt);
    // Station shoots back at player if player is nearby and station is being attacked
    if (station.hull < station.maxHull) {
      station.shootCooldown = (station.shootCooldown||0) - dt;
      const stDist2 = dist2(player, station);
      if (stDist2 < 600*600 && station.shootCooldown <= 0) {
        station.shootCooldown = 45 + rand(0,20);
        const aimAng = Math.atan2(player.y - station.y, player.x - station.x);
        for (let i = 0; i < 3; i++) {
          const offset = (i-1) * 0.15;
          bullets.push({id:mkid(), x:station.x, y:station.y,
            vx:Math.cos(aimAng+offset)*8, vy:Math.sin(aimAng+offset)*8,
            life:70, owner:"station", color:"#ffaa22", damage:18});
        }
      }
    }
  }

  // ── TRIBUTE FROM OWNED STATIONS ──────────────────────────────────────────────
  state.tributeTimer = (state.tributeTimer||0) + dt;
  if (state.tributeTimer > 1800) { // roughly every 30 seconds of flight
    state.tributeTimer = 0;
    const ownedCount = Object.keys(state.ownedStations).length;
    if (ownedCount > 0) {
      const tribute = ownedCount * 50;
      state.credits += tribute;
      updateHUD();
      showToast(`💰 Tribute received: +${tribute} Cr (${ownedCount} station${ownedCount>1?'s':''})`);
    }
  }

  // ── BOUNTY HUNTERS ────────────────────────────────────────────────────────────
  bountyHunterTimer -= dt;
  if (bountyHunterTimer <= 0) {
    bountyHunterTimer = 900 + rand(0, 600);
    // Check if any faction has us at enemy status
    const enemyFactions = Object.entries(state.reputation).filter(([f,v]) => v <= REP_ENEMY_THRESHOLD).map(([f])=>f);
    if (enemyFactions.length > 0) {
      // Spawn a bounty hunter — tough, fast ship
      const bhTypes = ["CentaurianFrigate","CentaurianCruiser","CentaurianCapital"];
      const bhType = bhTypes[Math.floor(rand(0,3))];
      const st = SHIP_TYPES[bhType] || SHIP_TYPES.CentaurianCruiser;
      const a = rand(0, Math.PI*2);
      const r = rand(400, 700);
      const bhFaction = enemyFactions[Math.floor(Math.random()*enemyFactions.length)];
      const fc2 = FACTION_COLORS[bhFaction] || "#ff6600";
      enemies.push({
        id:mkid(),
        x:player.x + Math.cos(a)*r, y:player.y + Math.sin(a)*r,
        vx:0, vy:0, angle:a,
        hull:st.maxHull*1.3|0, maxHull:st.maxHull*1.3|0,
        shield:st.maxShield*1.5|0, maxShield:st.maxShield*1.5|0,
        speed:st.speed*1.3, turnRate:st.turnRate*1.2, thrust:st.thrust*1.3,
        color:"#ff8800", label:`Bounty Hunter [${bhFaction.toUpperCase()}]`,
        bounty:[0,0], hostile:true, shootCooldown:0,
        shipType:bhType, faction:"bounty",
        isBountyHunter:true,
      });
      showToast(`🎯 BOUNTY HUNTER INCOMING — ${bhFaction.toUpperCase()} contract`);
    }
  }

  // Dock detection — station
  const dockDist=Math.sqrt(dist2(player,station));
  const dockBtn=document.getElementById("dockbutton");
  const dockPrompt=document.getElementById("dockprompt");
  // Planet landing detection
  const planetDist=Math.sqrt(dist2(player,planet));
  const nearStation = dockDist < 130;
  const nearPlanet  = planetDist < planet.r + 60;
  const nearAny = nearStation || nearPlanet;
  const sysFac = SYSTEMS[systemKey].faction;
  const sysRep = state.reputation[sysFac] || 0;
  const stationHostile = !station.owned && sysRep <= REP_HOSTILE_THRESHOLD;
  if(nearAny){
    if (nearStation && stationHostile) {
      dockBtn.classList.remove("visible");
      dockPrompt.style.opacity="1";
      dockPrompt.textContent = "🚫 HOSTILE STATION — Cannot dock";
      dockPrompt.style.color = "#ff4444";
    } else {
      dockBtn.classList.add("visible");
      dockPrompt.style.opacity="1";
      dockPrompt.style.color = "";
      dockPrompt.textContent = nearStation
        ? (station.owned ? "★ YOUR STATION  [E]" : "🛸 DOCK STATION  [E]")
        : "🌍 LAND  [E]";
    }
  } else {
    dockBtn.classList.remove("visible");
    dockPrompt.style.opacity="0";
  }

  // ── RENDER ──
  const cam={x:player.x-W2/2,y:player.y-H2/2};
  ctx.fillStyle="#060c14";ctx.fillRect(0,0,W2,H2);

  // Stars parallax
  stars.forEach(s=>{
    const sx=((s.x-cam.x*s.prl)%W2+W2)%W2;
    const sy=((s.y-cam.y*s.prl)%H2+H2)%H2;
    ctx.fillStyle=`rgba(255,255,255,${s.o})`;
    ctx.beginPath();ctx.arc(sx,sy,s.r,0,Math.PI*2);ctx.fill();
  });

  // Fog of war — check proximity to reveal objects
  const FOG_REVEAL_PLANET = planet.r + 300;
  const FOG_REVEAL_STATION = 280;
  if (!systemFogRevealed.planet && Math.hypot(player.x-planet.x, player.y-planet.y) < FOG_REVEAL_PLANET) {
    systemFogRevealed.planet = true;
    if (!state.exploredSystems) state.exploredSystems = {};
    state.exploredSystems[systemKey] = true;
    showToast(`🌍 ${(planet.name||SYSTEMS[systemKey].name).toUpperCase()} DISCOVERED`);
  }
  if (!systemFogRevealed.station && Math.hypot(player.x-station.x, player.y-station.y) < FOG_REVEAL_STATION) {
    systemFogRevealed.station = true;
    if (!state.exploredSystems) state.exploredSystems = {};
    state.exploredSystems[systemKey] = true;
    showToast(`🛸 STATION DETECTED`);
  }

  // Planet — only draw if revealed
  if (systemFogRevealed.planet) {
    drawPlanet(ctx,planet.x-cam.x,planet.y-cam.y,planet.r,planet.color);
    if (planet.name) {
      const px=planet.x-cam.x, py=planet.y-cam.y;
      ctx.font="bold 10px 'Courier New'"; ctx.textAlign="center";
      ctx.fillStyle="rgba(180,220,255,0.7)";
      ctx.fillText(planet.name.toUpperCase(), px, py+planet.r+14);
    }
  } else {
    // Draw a faint "unknown object" ping effect for planet if within long scanner range
    const pdist = Math.hypot(player.x-planet.x, player.y-planet.y);
    if (pdist < 700) {
      const px=planet.x-cam.x, py=planet.y-cam.y;
      const alpha = 0.15 * (1 - pdist/700);
      ctx.beginPath(); ctx.arc(px, py, 40, 0, Math.PI*2);
      ctx.strokeStyle=`rgba(74,158,255,${alpha})`; ctx.lineWidth=2; ctx.stroke();
      ctx.font="9px 'Courier New'"; ctx.textAlign="center";
      ctx.fillStyle=`rgba(74,158,255,${alpha*2})`;
      ctx.fillText("? UNKNOWN", px, py+50);
    }
  }

  // Station — only draw if revealed
  if (systemFogRevealed.station) {
    drawStationShape(ctx,station.x-cam.x,station.y-cam.y,FACTION_COLORS[SYSTEMS[systemKey].faction],station);
  } else {
    const sdist = Math.hypot(player.x-station.x, player.y-station.y);
    if (sdist < 500) {
      const sx2=station.x-cam.x, sy2=station.y-cam.y;
      const alpha = 0.12 * (1 - sdist/500);
      ctx.beginPath(); ctx.arc(sx2, sy2, 22, 0, Math.PI*2);
      ctx.strokeStyle=`rgba(74,255,154,${alpha})`; ctx.lineWidth=2; ctx.stroke();
      ctx.font="9px 'Courier New'"; ctx.textAlign="center";
      ctx.fillStyle=`rgba(74,255,154,${alpha*2})`;
      ctx.fillText("? SIGNAL", sx2, sy2+32);
    }
  }

  // Asteroids
  asteroids.forEach(a=>{
    if(a.hp<=0) return;
    const ax=a.x-cam.x, ay=a.y-cam.y;
    const hpFrac = a.hp/a.maxHp;
    const damaged = hpFrac < 0.6;

    // Advance 3D rotation — spin maps to rotY so it spins as it tumbles
    a.rotY += a.spin * dt * 1.2;

    // Render 3D sphere to offscreen canvas
    renderAsteroid3D(
      a.offCtx, _astTexCache[a.visualIdx],
      a.r, a.rotY, a.visDef.tiltX,
      a.visDef.roughness, a.visDef.specularity,
      damaged, hpFrac
    );

    // Draw to main canvas centred at asteroid world position
    const D = a.offCanvas.width;
    ctx.drawImage(a.offCanvas, ax - D/2, ay - D/2);

    // Glowing crack overlay when near destruction
    if(a.hp < a.maxHp*0.25){
      ctx.save();
      ctx.translate(ax,ay);
      const glowG = ctx.createRadialGradient(0,0,0,0,0,a.r*0.85);
      glowG.addColorStop(0,`rgba(255,80,0,0.22)`);
      glowG.addColorStop(1,`rgba(255,80,0,0)`);
      ctx.fillStyle=glowG;
      ctx.beginPath(); ctx.arc(0,0,a.r*0.85,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // HP bar for damaged asteroids
    if(a.hp<a.maxHp){
      const bw=a.r*2;
      ctx.fillStyle="#1a1a1a"; ctx.fillRect(ax-bw/2,ay-a.r-10,bw,3);
      ctx.fillStyle="#aa8844"; ctx.fillRect(ax-bw/2,ay-a.r-10,bw*hpFrac,3);
    }
  });

  // Dock range ring
  if(dockDist<180){
    ctx.strokeStyle="#ffffff22";ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.arc(station.x-cam.x,station.y-cam.y,80,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
  }

  // Enemies
  enemies.filter(e=>e.hull>0).forEach(e=>{
    const ex=e.x-cam.x,ey=e.y-cam.y;
    if(ex<-120||ex>W2+120||ey<-120||ey>H2+120)return;
    const st=SHIP_TYPES[e.shipType||"Fighter"];
    if(st.sprite) {
      drawCentaurianShip(ctx,ex,ey,e.angle,st,e.shield);
    } else {
      drawShipShape(ctx,ex,ey,e.angle,st.size,e.color,e.shield);
    }
    // Health bar
    const bw=st.size*2.4;
    const barY = ey - (st.drawSize ? st.drawSize*0.5 : st.size) - 16;
    // Shield bar (blue, above hull)
    if(e.maxShield > 0) {
      ctx.fillStyle="#0a1020";ctx.fillRect(ex-bw/2, barY-6, bw, 3);
      ctx.fillStyle=`rgba(100,180,255,0.85)`;ctx.fillRect(ex-bw/2, barY-6, bw*(e.shield/e.maxShield), 3);
    }
    // Hull bar (green/yellow/red)
    const hf = e.hull/e.maxHull;
    ctx.fillStyle="#0a1a0a";ctx.fillRect(ex-bw/2,barY,bw,4);
    ctx.fillStyle=hf>0.5?"#4aff4a":hf>0.25?"#ffcc44":"#ff4444";ctx.fillRect(ex-bw/2,barY,bw*hf,4);
    // Hostile indicator
    if(e.hostile){ctx.fillStyle="#ff4444";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText("⚠",ex,barY-10);}
    // Ship name on hover proximity
    if(dist2(e,player)<350*350){
      ctx.fillStyle=e.hostile?"#ff6644":"#4a9eff";
      ctx.font="9px 'Courier New'"; ctx.textAlign="center";
      ctx.fillText(e.label, ex, barY - (e.hostile ? 20 : 14));
    }
  });

  // Bullets — with proximity danger indicators for enemy shots
  let dangerFlash = 0;
  bullets.forEach(b=>{
    const bx=b.x-cam.x, by=b.y-cam.y;
    const isEnemy = b.owner !== "player";
    const bd2 = isEnemy ? dist2(b, player) : Infinity;
    const dangerClose = bd2 < 120*120;
    const dangerNear  = bd2 < 220*220;

    // Size: enemy bullets slightly bigger and more menacing when close
    const brad = dangerClose ? 7 : dangerNear ? 6 : 5;
    const g=ctx.createRadialGradient(bx,by,0,bx,by,brad);
    g.addColorStop(0, dangerClose ? "#ffaa00" : b.color);
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,brad,0,Math.PI*2); ctx.fill();

    // Trail
    ctx.strokeStyle=(dangerClose?"#ffaa0088":b.color+"88"); ctx.lineWidth=dangerClose?2:1.5;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx-b.vx*2.2,by-b.vy*2.2); ctx.stroke();

    // Danger: draw a faint line from bullet toward player center when very close
    if (dangerClose && isEnemy) {
      dangerFlash = Math.max(dangerFlash, 1 - Math.sqrt(bd2)/120);
      ctx.save();
      ctx.strokeStyle = `rgba(255,80,0,${0.25*(1-Math.sqrt(bd2)/120)})`;
      ctx.lineWidth=1; ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(W2/2,H2/2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
  });
  // Screen edge flash when in danger
  if (dangerFlash > 0.05) {
    ctx.save();
    const ef = ctx.createRadialGradient(W2/2,H2/2,Math.min(W2,H2)*0.3,W2/2,H2/2,Math.min(W2,H2)*0.7);
    ef.addColorStop(0,"transparent");
    ef.addColorStop(1,`rgba(255,60,0,${dangerFlash*0.25})`);
    ctx.fillStyle=ef; ctx.fillRect(0,0,W2,H2); ctx.restore();
  }

  // Particles
  particles.forEach(p=>{
    const px=p.x-cam.x,py=p.y-cam.y,a=p.life/p.maxLife;
    ctx.fillStyle=p.color+Math.floor(a*255).toString(16).padStart(2,"0");
    ctx.beginPath();ctx.arc(px,py,rand(1,3),0,Math.PI*2);ctx.fill();
  });

  // Player ship (center) — sprite with engine effects
  engineTick++;
  setThruster(thrustMag);
  drawPlayerShip(ctx, W2/2, H2/2, player.angle, thrustMag, engineTick);

  // Strafe indicator — show lateral thrust visually
  // (no strafe indicator needed)

  // Brake flash ring
  if (braking) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,140,40,0.65)";
    ctx.lineWidth = 1.5; ctx.setLineDash([2,4]);
    ctx.beginPath(); ctx.arc(W2/2, H2/2, 40, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  // Shield ring drawn on top
  if (player.shield > 0) {
    ctx.beginPath(); ctx.arc(W2/2, H2/2, 32, 0, Math.PI*2);
    ctx.strokeStyle=`rgba(100,180,255,${clamp(player.shield/120,0,0.6)})`;
    ctx.lineWidth=2; ctx.stroke();
  }

  // ── MINIMAP ──
  mmCtx.fillStyle="#060c14cc";mmCtx.fillRect(0,0,90,90);
  mmCtx.fillStyle=planet.color+"88";mmCtx.beginPath();mmCtx.arc((planet.x/WORLD)*90,(planet.y/WORLD)*90,4,0,Math.PI*2);mmCtx.fill();
  // Station dot — green if owned, faction color otherwise
  const stationMmColor = station.owned ? "#4aff9a" : FACTION_COLORS[SYSTEMS[systemKey].faction];
  mmCtx.strokeStyle=stationMmColor;mmCtx.lineWidth = station.owned ? 2 : 1;
  mmCtx.beginPath();mmCtx.arc((station.x/WORLD)*90,(station.y/WORLD)*90,3,0,Math.PI*2);mmCtx.stroke();
  // Asteroids on minimap
  asteroids.filter(a=>a.hp>0).forEach(a=>{
    const ms = a.size==="large"?2:a.size==="medium"?1.5:1;
    mmCtx.fillStyle="#886644";mmCtx.beginPath();mmCtx.arc((a.x/WORLD)*90,(a.y/WORLD)*90,ms,0,Math.PI*2);mmCtx.fill();
  });
  enemies.filter(e=>e.hull>0).forEach(e=>{
    const col = e.isBountyHunter ? "#ff8800" : (e.hostile?"#ff4444":"#4a9eff66");
    mmCtx.fillStyle=col;
    mmCtx.beginPath();mmCtx.arc((e.x/WORLD)*90,(e.y/WORLD)*90,e.isBountyHunter?3:(e.hostile?2.5:1.5),0,Math.PI*2);mmCtx.fill();
  });
  mmCtx.fillStyle="#00ffdd";mmCtx.beginPath();mmCtx.arc((player.x/WORLD)*90,(player.y/WORLD)*90,3,0,Math.PI*2);mmCtx.fill();

  requestAnimationFrame(tick);
}

