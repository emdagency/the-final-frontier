# The Final Frontier 🚀

A browser-based space exploration and combat game. Navigate the galaxy, trade, fight pirates and Centaurian fleets, complete missions, and build your reputation across 13 star systems.

## Play

Open `index.html` in any modern browser — or host on GitHub Pages:  
`https://[your-username].github.io/the-final-frontier/`

> **Note:** Must be served over HTTP/HTTPS (not opened as a local file) due to ES module loading. Use GitHub Pages, VS Code Live Server, or `python3 -m http.server`.

---

## Project Structure

```
the-final-frontier/
├── index.html              # Game shell — HTML structure only
├── styles.css              # All CSS / UI layout
├── js/
│   ├── audio.js            # Web Audio engine (thruster sounds, SFX)
│   ├── data.js             # Game constants: star systems, ship types, enemies
│   ├── engine.js           # State, save/load, canvas setup, world generation
│   ├── render.js           # Draw functions, game loop, asteroids, missions
│   ├── input.js            # Keyboard, touch, and event handlers
│   ├── ui.js               # Dock screen, galaxy map, shop UI
│   ├── main.js             # Boot / init
│   └── sprites/
│       ├── centaurian.js   # Centaurian enemy ship sprites (base64 PNG)
│       ├── player.js       # Player ship sprite + engine flame config
│       └── environment.js  # Planet and space station sprites (base64 PNG)
```

### File Size Guide
| File | Size | Edit frequency |
|------|------|----------------|
| sprites/centaurian.js | ~4.3 MB | Rarely |
| sprites/environment.js | ~4.1 MB | Rarely |
| sprites/player.js | ~425 KB | Rarely |
| render.js | ~44 KB | Often |
| ui.js | ~21 KB | Often |
| engine.js | ~18 KB | Often |
| data.js | ~6 KB | Often |
| styles.css | ~16 KB | Sometimes |
| audio.js | ~6 KB | Sometimes |
| input.js | ~12 KB | Sometimes |

---

## Gameplay

- **WASD / Arrow keys** — thrust and rotate
- **Space** — fire weapons
- **M** — galaxy map
- **Dock** — approach a station and press the DOCK button (touch) or D key

### Star Systems
13 systems across 4 factions: Federation, Rebel, Pirate, Neutral. Each has unique prices, missions, and danger levels.

### Progression
- Earn credits from bounties and trading
- Upgrade hull, shields, and weapons at stations
- Complete faction missions to gain reputation
- Survive Centaurian invasion fleets

---

## GitHub Pages Setup

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your game will be live at `https://[username].github.io/[repo-name]/`
