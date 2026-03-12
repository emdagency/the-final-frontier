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

---

## Ship Sprite System (player.js)

### How it works
The player ship sprite is a base64-encoded PNG string embedded directly in `js/sprites/player.js`. It is loaded once at startup into an `Image` object and drawn each frame via `drawPlayerShip()` in `render.js`.

Key constants in `player.js`:
- `SHIP_B64` — the base64 image string
- `SHIP_RENDER_H / SHIP_RENDER_W` — render size in pixels (currently 120×120)
- `NOZZLES[]` — positions of rear engine nozzles (for flame effects), relative to ship center in render space
- `RETRO_THRUSTERS[]` — positions of wing retro thrusters (for brake glow)
- `WEAPON_PORTS{}` — positions of gun hardpoints; `defaultEquipped: true` means active from the start
- `FLAME_CFG` — flame length, width, colors (`colorInner` / `colorOuter`), flicker amplitude
- `RETRO_CFG` — retro glow radius and colors (`colorInner` / `colorOuter`)
- `WING_GUN_CONVERGENCE` — bullet angle toe-in (radians)

### How the ship is rendered (render.js)
`drawPlayerShip()` draws in this order:
1. Engine flame plumes (from `NOZZLES`) when thrusting
2. Retro glow dots (from `RETRO_THRUSTERS`) when braking
3. Ship sprite using **`screen` blend mode** to eliminate black background

The `screen` blend mode is critical — it mathematically eliminates pure black pixels at draw time, so the sprite does not need a transparent PNG. A black-background PNG works perfectly.

### Replacing the ship sprite

**Recommended workflow:**
1. Source or create a ship image with a **pure black background** (black = `#000000`)
2. Run this Python script to convert it to base64 and inject it into `player.js`:

```python
import base64, re

with open("your-ship.png", "rb") as f:
    png_bytes = f.read()

data_uri = "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

with open("js/sprites/player.js") as f:
    content = f.read()

new_content = re.sub(
    r'(const SHIP_B64\s*=\s*")[^"]*(")',
    lambda m: m.group(1) + data_uri + m.group(2),
    content
)

with open("js/sprites/player.js", "w") as f:
    f.write(new_content)
```

3. After changing `player.js`, bump the cache-bust version in `index.html`:
```html
<!-- Change ?v=N to the next number each time player.js is updated -->
<script src="js/sprites/player.js?v=5"></script>
```
This forces all browsers and devices to fetch the new file immediately.

**Important:** PNG transparency is NOT required because `render.js` uses `screen` blend mode. A black background PNG works fine and is easier to produce.

**Do NOT use JPEG** — JPEG compression artifacts create visible fringes at blend time. Always use PNG.

### Nozzle / weapon port offsets
Offsets in `player.js` are in **render space** (pixels, relative to ship center at 0,0, with ship pointing up). To recalculate offsets for a new sprite:
- Ship renders at `SHIP_RENDER_H × SHIP_RENDER_W` pixels
- Scale factor = `SHIP_RENDER_H / original_image_height`
- Offset = `(pixel_position_in_source_image - image_center) × scale_factor`

### Cache busting
Any time `player.js` is changed, increment the `?v=N` query string on its `<script>` tag in `index.html`. This is the only reliable way to force all browsers and devices (including mobile) to load the new version.

