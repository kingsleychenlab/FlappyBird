/* =========================================================================
   FlapLab — a Flappy Bird style arcade flyer
   Pure Canvas + vanilla JS. No engine, no assets, no backend.
   ========================================================================= */

(() => {
  "use strict";

  // ---- Canvas setup ------------------------------------------------------
  // We design the game in a fixed virtual resolution (VW x VH), but the whole
  // scene is first drawn into a small low-resolution buffer and then blown up
  // with nearest-neighbour scaling. That upscale is what gives the crunchy,
  // pixel-art Flappy Bird look — every shape becomes chunky pixels.
  const VW = 360; // virtual width
  const VH = 640; // virtual height
  const PX = 2; // virtual units per rendered pixel (higher = chunkier)
  const BW = Math.round(VW / PX); // buffer width  (180)
  const BH = Math.round(VH / PX); // buffer height (320)

  const canvas = document.getElementById("game");
  const screen = canvas.getContext("2d"); // the visible canvas

  // Offscreen low-res buffer that all draw functions render into.
  const buf = document.createElement("canvas");
  buf.width = BW;
  buf.height = BH;
  const ctx = buf.getContext("2d");
  ctx.setTransform(BW / VW, 0, 0, BH / VH, 0, 0); // draw in virtual coords
  ctx.imageSmoothingEnabled = false;

  let dpr = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    screen.imageSmoothingEnabled = false; // keep pixels crisp when scaling up
  }
  window.addEventListener("resize", resize);

  // ---- Tuning constants --------------------------------------------------
  const GROUND_H = 90;
  const PLAY_H = VH - GROUND_H; // playable sky height
  const GRAVITY = 1500; // px / s^2
  const FLAP_V = -430; // instant upward velocity on flap
  const BIRD_R = 15; // bird collision radius
  const BIRD_X = VW * 0.28;

  const PIPE_W = 62;
  const GAP_BASE = 175; // starting vertical gap
  const GAP_MIN = 128; // gap never shrinks below this
  const PIPE_SPACING = 220; // horizontal distance between pipes
  const SPEED_BASE = 150; // px / s
  const SPEED_MAX = 260;
  const SPEED_RAMP = 3.5; // speed gained per point

  // ---- Game state --------------------------------------------------------
  const State = { START: 0, PLAY: 1, OVER: 2 };
  let state = State.START;

  let bird, pipes, clouds, coins, coinTimer, groundX, hillX, speed, gap, score, lastTime;
  let overAt = 0; // timestamp of the last game over (guards instant restart)
  let best = loadBest();

  function loadBest() {
    const v = parseInt(localStorage.getItem("flaplab.best"), 10);
    return Number.isFinite(v) ? v : 0;
  }
  function saveBest() {
    localStorage.setItem("flaplab.best", String(best));
  }

  // ---- Entities ----------------------------------------------------------
  function makeClouds() {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      arr.push({
        x: Math.random() * VW,
        y: 40 + Math.random() * (PLAY_H - 180),
        s: 0.6 + Math.random() * 0.9, // size factor
        v: 8 + Math.random() * 14, // parallax speed
      });
    }
    return arr;
  }

  function spawnPipe(x) {
    const margin = 55;
    const topMax = PLAY_H - gap - margin;
    const top = margin + Math.random() * (topMax - margin);
    return { x, top, bottom: top + gap, passed: false };
  }

  function reset() {
    bird = { y: PLAY_H * 0.45, v: 0, angle: 0, wing: 0 };
    speed = SPEED_BASE;
    gap = GAP_BASE;
    score = 0;
    groundX = 0;
    hillX = 0;
    coins = [];
    coinTimer = 0;
    pipes = [];
    for (let i = 0; i < 3; i++) {
      pipes.push(spawnPipe(VW + 120 + i * PIPE_SPACING));
    }
    clouds = clouds || makeClouds();
    updateHud();
  }

  // ---- Input -------------------------------------------------------------
  function flap() {
    if (state === State.PLAY) {
      bird.v = FLAP_V;
      bird.wing = 1; // trigger wing animation
    } else if (state === State.START) {
      startGame();
    } else if (state === State.OVER) {
      // Space / tap replays, but only after a brief moment so a panic press
      // at the instant of death doesn't skip the score screen.
      if (performance.now() - overAt > 500) startGame();
    }
  }

  function startGame() {
    reset();
    state = State.PLAY;
    lastTime = performance.now();
    show(hud);
    hide(startScreen);
    hide(overScreen);
  }

  function endGame() {
    state = State.OVER;
    overAt = performance.now();
    hide(hud);
    finalScoreEl.textContent = score;
    const isNew = score > best;
    if (isNew) {
      best = score;
      saveBest();
    }
    bestScoreEl.textContent = best;
    newBestEl.classList.toggle("hidden", !isNew);
    show(overScreen);
  }

  // ---- Update ------------------------------------------------------------
  function update(dt) {
    // Animate clouds & ground continuously so menus feel alive.
    for (const c of clouds) {
      c.x -= c.v * dt;
      if (c.x < -60 * c.s) {
        c.x = VW + 40;
        c.y = 40 + Math.random() * (PLAY_H - 180);
      }
    }
    groundX = (groundX - speed * dt) % 24;
    hillX = (hillX - speed * 0.18 * dt) % 180; // slow parallax

    // Money trail keeps drifting & falling even after a crash so it fades out.
    for (const c of coins) {
      c.x -= speed * dt;
      c.vy += 260 * dt;
      c.y += c.vy * dt;
      c.spin += dt * 9;
      c.life -= dt / 0.9;
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].life <= 0 || coins[i].x < -14) coins.splice(i, 1);
    }

    if (state !== State.PLAY) return;

    // Drop a coin behind the bird every so often -> a trailing stream of money.
    coinTimer += dt;
    if (coinTimer >= 0.08) {
      coinTimer = 0;
      coins.push({
        x: BIRD_X - 10,
        y: bird.y + 5,
        vy: (Math.random() * 2 - 1) * 26,
        spin: Math.random() * Math.PI,
        life: 1,
      });
    }

    // Difficulty ramps with score.
    speed = Math.min(SPEED_MAX, SPEED_BASE + score * SPEED_RAMP);
    gap = Math.max(GAP_MIN, GAP_BASE - score * 1.5);

    // Bird physics.
    bird.v += GRAVITY * dt;
    bird.y += bird.v * dt;
    // Tilt: nose up when rising, dive when falling.
    const target = Math.max(-0.5, Math.min(1.4, bird.v / 500));
    bird.angle += (target - bird.angle) * Math.min(1, dt * 10);
    if (bird.wing > 0) bird.wing = Math.max(0, bird.wing - dt * 4);

    // Move pipes.
    for (const p of pipes) {
      p.x -= speed * dt;
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        score++;
        updateHud();
      }
    }

    // Recycle & spawn pipes.
    if (pipes.length && pipes[0].x + PIPE_W < -10) pipes.shift();
    const last = pipes[pipes.length - 1];
    if (last.x < VW - PIPE_SPACING) pipes.push(spawnPipe(last.x + PIPE_SPACING));

    // Collisions.
    if (bird.y + BIRD_R >= PLAY_H) {
      bird.y = PLAY_H - BIRD_R;
      return endGame();
    }
    if (bird.y - BIRD_R <= 0) {
      bird.y = BIRD_R; // clamp to ceiling instead of instant death
      bird.v = 0;
    }
    for (const p of pipes) {
      if (hitsPipe(p)) return endGame();
    }
  }

  // Circle (bird) vs the two pipe rectangles. Uses closest-point distance
  // for accurate corner collisions.
  function hitsPipe(p) {
    if (BIRD_X + BIRD_R < p.x || BIRD_X - BIRD_R > p.x + PIPE_W) return false;
    return (
      circleRect(BIRD_X, bird.y, BIRD_R, p.x, 0, PIPE_W, p.top) ||
      circleRect(BIRD_X, bird.y, BIRD_R, p.x, p.bottom, PIPE_W, PLAY_H - p.bottom)
    );
  }
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  // ---- Render ------------------------------------------------------------
  function draw() {
    ctx.clearRect(0, 0, VW, VH);

    // Sky gradient.
    const sky = ctx.createLinearGradient(0, 0, 0, PLAY_H);
    sky.addColorStop(0, "#4ec0e0");
    sky.addColorStop(1, "#b8ecff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, PLAY_H);

    drawSun();
    drawHills();
    for (const c of clouds) drawCloud(c);
    for (const p of pipes) drawPipe(p);
    drawGround();
    for (const c of coins) drawCoin(c);
    drawBird();

    // Blit the low-res buffer to the visible canvas, scaled up with no
    // smoothing -> chunky pixels.
    screen.imageSmoothingEnabled = false;
    screen.clearRect(0, 0, canvas.width, canvas.height);
    screen.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }

  // A little spinning gold coin in the bird's money trail.
  function drawCoin(c) {
    const a = Math.max(0, Math.min(1, c.life));
    const r = 5;
    const rx = Math.max(1.5, Math.abs(Math.cos(c.spin)) * r); // spin squash
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(c.x, c.y - r, c.x, c.y + r);
    g.addColorStop(0, "#fff2a8");
    g.addColorStop(0.5, "#ffd23f");
    g.addColorStop(1, "#e6a200");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(150,95,0,0.9)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Face-on coins show a little $ mark.
    if (rx > 2.6) {
      ctx.fillStyle = "#8a5a00";
      ctx.fillRect(c.x - 0.6, c.y - r + 1.5, 1.3, r * 2 - 3);
    }
    ctx.restore();
  }

  function drawCloud(c) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    const r = 18 * c.s;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.arc(c.x + r, c.y + 4, r * 0.85, 0, Math.PI * 2);
    ctx.arc(c.x - r, c.y + 4, r * 0.8, 0, Math.PI * 2);
    ctx.arc(c.x + r * 0.3, c.y - r * 0.6, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSun() {
    const sx = VW * 0.8;
    const sy = PLAY_H * 0.2;
    const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 90);
    glow.addColorStop(0, "rgba(255,255,255,0.9)");
    glow.addColorStop(0.35, "rgba(255,241,180,0.55)");
    glow.addColorStop(1, "rgba(255,241,180,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 90, sy - 90, 180, 180);
    ctx.fillStyle = "#fff6d0";
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two layered rows of rolling hills for depth.
  function drawHills() {
    hillRow(PLAY_H - 30, 70, "#8fd6a8", hillX);
    hillRow(PLAY_H - 8, 90, "#6ec48c", hillX * 1.6);
  }
  function hillRow(baseY, h, color, offset) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-40, baseY + h);
    const step = 90;
    for (let x = ((offset % step) - step) - 40; x < VW + step; x += step) {
      ctx.quadraticCurveTo(x + step / 2, baseY - h * 0.5, x + step, baseY);
    }
    ctx.lineTo(VW + 60, baseY + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipe(p) {
    const capH = 26;
    const bodyGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
    bodyGrad.addColorStop(0, "#5cbf3a");
    bodyGrad.addColorStop(0.5, "#7ed957");
    bodyGrad.addColorStop(1, "#4ea82f");

    // Top pipe
    roundedPipe(p.x, 0, PIPE_W, p.top, bodyGrad, capH, false);
    // Bottom pipe
    roundedPipe(p.x, p.bottom, PIPE_W, PLAY_H - p.bottom, bodyGrad, capH, true);
  }

  function roundedPipe(x, y, w, h, grad, capH, capOnTop) {
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // Shading edges for a rounded, glossy tube look.
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 6, y, 6, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + w - 10, y, 8, h);
    // Cap (wider rim at the mouth of the pipe).
    const capY = capOnTop ? y : y + h - capH;
    ctx.fillStyle = grad;
    const cx = x - 4;
    const cw = w + 8;
    ctx.fillRect(cx, capY, cw, capH);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 1, capY + 1, cw - 2, capH - 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(cx + 5, capY + 4, 6, capH - 8);
  }

  function drawGround() {
    // Base soil
    ctx.fillStyle = "#ded39a";
    ctx.fillRect(0, PLAY_H, VW, GROUND_H);
    // Grass strip
    ctx.fillStyle = "#8ed24f";
    ctx.fillRect(0, PLAY_H, VW, 16);
    ctx.fillStyle = "#77bb3f";
    ctx.fillRect(0, PLAY_H + 14, VW, 4);
    // Moving hatch pattern for a sense of speed.
    ctx.fillStyle = "#cbbf82";
    for (let x = groundX; x < VW; x += 24) {
      ctx.fillRect(x, PLAY_H + 24, 12, GROUND_H - 24);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(BIRD_X, bird.y);
    ctx.rotate(bird.angle);

    // Body
    const g = ctx.createRadialGradient(-4, -4, 4, 0, 0, BIRD_R + 4);
    g.addColorStop(0, "#ffe27a");
    g.addColorStop(1, "#f5b301");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wing (flaps up briefly after a tap)
    const wingLift = Math.sin(bird.wing * Math.PI) * 8;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.ellipse(-3, 3 - wingLift, 9, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-2, 4, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2b3a";
    ctx.beginPath();
    ctx.arc(9, -5, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#ff8c2b";
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, -2);
    ctx.lineTo(BIRD_R + 8, 1);
    ctx.lineTo(BIRD_R - 2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ---- Main loop ---------------------------------------------------------
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps (tab switch)
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- DOM refs & helpers ------------------------------------------------
  const hud = document.getElementById("hud");
  const hudScore = document.getElementById("hudScore");
  const startScreen = document.getElementById("startScreen");
  const overScreen = document.getElementById("overScreen");
  const startBest = document.getElementById("startBest");
  const finalScoreEl = document.getElementById("finalScore");
  const bestScoreEl = document.getElementById("bestScore");
  const newBestEl = document.getElementById("newBest");

  const show = (el) => el.classList.remove("hidden");
  const hide = (el) => el.classList.add("hidden");
  function updateHud() {
    hudScore.textContent = score;
  }

  // ---- Wire up events ----------------------------------------------------
  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      flap();
    }
  });

  // Pointer (covers mouse + touch). Ignore taps on UI buttons/panels.
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    flap();
  });

  // ---- Boot --------------------------------------------------------------
  clouds = makeClouds();
  reset();
  resize();
  startBest.textContent = best;
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
