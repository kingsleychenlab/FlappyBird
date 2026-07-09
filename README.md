# Flappy Bird

A polished, browser-based Flappy Bird–style arcade game. Fly a little bird
through the gaps between pipes for as long as you can. Pure HTML, CSS, and
JavaScript on the Canvas — no engine, no libraries, no backend.

## Features

- **Pixel-art rendering** — the scene is drawn to a low-res buffer and upscaled with no smoothing for a crisp retro look
- **Arcade cabinet UI** — neon marquee, CRT screen, and control deck set in a synthwave arcade room
- **Smooth physics** — frame-rate-independent (delta-time) movement and collision
- **Money trail** — the bird drops a stream of spinning gold coins as it flies
- **Rising difficulty** — pipes speed up and gaps narrow as your score climbs
- **High score** — saved to `localStorage` between sessions
- **Responsive** — scales cleanly to any screen, desktop or mobile
- **Original art** — every shape is drawn in code; no copyrighted assets

## Controls

| Action | Input |
| ------ | ----- |
| Flap   | `Space` · click · tap |
| Start  | `Space` or the **Start** button |
| Replay | `Space` or the **Play Again** button |

## Run locally

No build step. Just open `index.html` in a browser.

```bash
open index.html          # macOS
```

Or serve it (recommended on mobile):

```bash
python3 -m http.server 8000     # then visit http://localhost:8000
```

## Tech stack

`HTML` · `CSS` · `JavaScript` · `Canvas 2D` — no dependencies.

## Structure

```
index.html   # page + overlay screens
style.css    # arcade UI and layout
script.js    # game loop, physics, rendering
```

## Screenshots

| Start | In game | Game over |
| :---: | :-----: | :-------: |
| _add image_ | _add image_ | _add image_ |

## License

Original code and art — free to use and modify.
