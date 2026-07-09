# Flappy Bird 🐤

A polished, browser-based Flappy Bird–style arcade flyer. Guide a little bird
through gaps between pipes — tap, click, or press Space to flap. Built with pure
HTML, CSS, and JavaScript on the Canvas API. No engine, no assets, no backend.

## Features

- 🎮 Smooth, frame-rate-independent physics (delta-time game loop)
- 🟢 Clean procedurally-drawn bird, pipes, clouds, and scrolling ground — all
  original shapes, no copyrighted art
- 📈 Gradual difficulty ramp: pipes speed up and gaps narrow as your score climbs
- 🎯 Accurate circle-vs-rectangle collision detection
- 🏆 High score saved in `localStorage` and shown on the start/game-over screens
- 📱 Fully responsive — one virtual resolution scaled crisply to any screen (Retina aware)
- ✨ Arcade-style start screen, live HUD, and game-over screen with a "New Best!" flourish

## Controls

| Action | Input |
| ------ | ----- |
| Flap   | `Space` key |
| Flap   | Mouse click |
| Flap   | Touch tap (mobile) |
| Start / Restart | On-screen button (or flap on the start screen) |

## How to run locally

No build step, no dependencies. Just open the file:

```bash
# from the project folder
open index.html        # macOS
# or double-click index.html in your file explorer
```

Optionally serve it (handy on mobile or to avoid any file:// quirks):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech stack

- **HTML** — markup and overlay screens
- **CSS** — arcade UI, responsive stage, animations
- **JavaScript** — game loop, physics, rendering, input, persistence
- **Canvas 2D API** — all in-game rendering
- No backend, no external libraries, no paid APIs

## Project structure

```
flappybird/
  index.html   # page structure + screens
  style.css    # arcade styling and layout
  script.js    # game engine and logic
  README.md
```

## Screenshots

> Add your own captures here.

| Start screen | In game | Game over |
| ------------ | ------- | --------- |
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

## License

Original code and art. Free to use and modify.
