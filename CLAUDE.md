# CLAUDE.md — AI Assistant Instructions for The Final Frontier

> Paste this file's contents at the start of any new Claude conversation to get up to speed instantly.

---

## Project: The Final Frontier

A browser-based 2D space game. Single HTML/CSS/JS project, no build tools, no frameworks. Runs directly in browser via GitHub Pages.

**GitHub Pages URL:** `https://[your-username].github.io/the-final-frontier/`

---

## File Structure

```
index.html              ← HTML shell only (6KB) — rarely needs editing
styles.css              ← All CSS (16KB)
js/
  audio.js              ← Web Audio thruster + SFX engine (6KB)
  data.js               ← SYSTEMS, SHIP_TYPES, ENEMY_CFGS, ASTEROID_SIZES (6KB)
  engine.js             ← State vars, save/load, canvas setup, world init (18KB)
  render.js             ← Game loop, draw functions, asteroids, missions (44KB)
  input.js              ← Keyboard, touch, event handlers (12KB)
  ui.js                 ← Dock screen, galaxy map, shop (21KB)
  main.js               ← Boot only (< 1KB)
  sprites/
    centaurian.js       ← CENTAURIAN_B64 object: fighter/cruiser/frigate/capital (4.3MB)
    player.js           ← SHIP_B64 string + NOZZLES + flame config (430KB)
    environment.js      ← PLANET_B64 + STATION_B64 strings (4.1MB)
```

**Never upload sprite files to Claude** — they are huge base64 image blobs and will fill the context window. Only upload the JS files you actually need to edit.

---

## Key Variables & Architecture

### Global State (engine.js)
- `player` — ship object: `{x, y, vx, vy, angle, hull, shield, maxHull, maxShield, speed, thrust, turnRate, shipType, credits, cargo}`
- `state` — game flags: `{credits, reputation, missions[], kills, faction standings}`
- `systemKey` — current star system key (e.g. `"sol"`, `"vega"`)
- `enemies[]`, `asteroids[]`, `bullets[]`, `particles[]` — live entity arrays

### Game Data (data.js)
- `SYSTEMS` — 13 star systems with position, faction, neighbors
- `SHIP_TYPES` — player and enemy ship stat blocks
- `CENTAURIAN_FLEET` — spawn weights for alien enemies
- `ENEMY_CFGS` — faction-based enemy configurations
- `ASTEROID_SIZES` — small/medium/large radius, HP, damage

### Sprites (sprites/)
- `centaurianImgs` — object keyed by `"fighter"`, `"cruiser"`, `"frigate"`, `"capital"`
- `shipSprite` — player ship Image object
- `planetSprite`, `stationSprite` — environment Image objects

### Render Pipeline (render.js)
- Main loop: `gameLoop()` → `update()` → `draw()`
- Draw order: stars → asteroids → station → planet → enemies → player → bullets → particles → HUD
- Asteroid system uses pre-rendered offscreen canvases (`ASTEROID_VISUAL_DEFS`)

### UI Screens (ui.js)
- `dockShip()` / `undockShip()` — station docking flow
- `showGalaxyMap()` / `hideGalaxyMap()` — map overlay
- `openShop()` — upgrade purchasing

---

## Common Edit Tasks

### Add a new star system
Edit `SYSTEMS` in `data.js`. Add key with `{name, x, y, faction, desc, neighbors[]}`.

### Tweak enemy stats
Edit `SHIP_TYPES` in `data.js`. Adjust `maxHull`, `maxShield`, `speed`, `damage`.

### Change spawn rates
Edit `CENTAURIAN_FLEET` weights in `data.js`, or enemy spawn logic in `render.js` around the `// ── GAME LOOP` section.

### Add a new mission type
Edit `render.js` around `// ── MISSION SYSTEM` (~line 1708 in original).

### Change station shop items
Edit `ui.js` around `// ── DOCK / STATION` section.

### Modify HUD / UI layout
Edit `styles.css` or `index.html`.

### Add new sound effect
Edit `audio.js` — all audio uses Web Audio API (no external files).

### Replace a sprite image
- Convert new PNG to base64: `btoa(...)` or online tool
- Replace the base64 string in the relevant `sprites/` file
- Centaurian ships: `sprites/centaurian.js` — update the correct key in `CENTAURIAN_B64`
- Player ship: `sprites/player.js` — replace `SHIP_B64` string
- Planet/Station: `sprites/environment.js` — replace `PLANET_B64` or `STATION_B64`

---

## Coding Conventions

- Vanilla JS only — no imports, no modules, no bundler
- All scripts load globally via `<script src="...">` tags in `index.html`
- Variables shared across files are simply global (no module exports needed)
- Canvas 2D context is `c` (the variable), canvas element is `gameCanvas`
- `rand(a, b)` — utility for random float in range
- `dist2(a, b)` — squared distance between two `{x,y}` objects
- `mkid()` — generates unique entity IDs

---

## What NOT to Do

- ❌ Don't add `import`/`export` — this isn't a module project
- ❌ Don't upload sprite files to Claude — they're too large
- ❌ Don't introduce npm, webpack, or build tools
- ❌ Don't add external CDN dependencies (keep it self-contained)

---

## GitHub Pages

Repo is deployed via GitHub Pages from the `main` branch root. After any commit, changes go live within ~30 seconds. No build step needed.
