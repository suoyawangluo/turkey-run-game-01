// main.js — Gobble Dash: the game loop, states, input, spawning, collisions,
// HUD and screens. The turkey runs from the farmyard, through the barn, across
// the kitchen and out the back door at 1200 metres. The farmer gains on every
// stumble; hide in a haystack or grab a golden feather to push him back.

import { drawBackground, drawTurkey, drawFarmer, STAGE_ART } from './art.js';
import { GROUND_Y, TURKEY_X, createTurkey, turkeyJump, turkeySlide, turkeyHide, turkeyUpdate, turkeyHitbox, turkeyOnGround } from './turkey.js';
import { createFarmer, farmerStumble, farmerHideFallback, farmerFeatherFallback, farmerUpdate, farmerThreat, farmerCaught, FARMER_CATCH_X } from './farmer.js';
import { spawnObstacle, spawnPickup, spawnHaystack, updateObstacle, obstacleOffscreen, obstacleHurts, pickupHitbox, drawObstacle, drawPickup, drawHaystack } from './obstacles.js';
import { ESCAPE_DISTANCE_M, stageFor, speedFor, spawnIntervalFor, pickObstacle, mulberry32 } from './stages.js';
import { sfx, toggleMute, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const PX_PER_M = 50;

// Debug hooks for screenshots (same render path, no cheat in play):
// ?start=<metres> begins the run part-way; ?state=caught|escaped opens an end screen.
const params = new URLSearchParams(location.search);
const debugStart = Math.max(0, Math.min(ESCAPE_DISTANCE_M - 5, Number(params.get('start')) || 0));
const debugState = params.get('state');

function loadBest() {
  try {
    return Number(localStorage.getItem('gobble-dash-best') || 0);
  } catch {
    return 0;
  }
}

function saveBest(m) {
  try {
    localStorage.setItem('gobble-dash-best', String(Math.floor(m)));
  } catch {
    // Storage unavailable (private mode, file://): best score just isn't kept.
  }
}

const game = {
  state: 'title', // title | play | caught | escaped | paused
  time: 0,
  distanceM: 0,
  scrollX: 0,
  score: 0,
  lives: 3,
  speed: 260,
  spawnTimer: 1.2,
  obstacles: [],
  pickups: [],
  haystacks: [],
  turkey: createTurkey(),
  farmer: createFarmer(),
  best: loadBest(),
  rng: mulberry32(20261127),
  message: '',
  messageTimer: 0,
  nearHaystack: null,
  inPuddle: false,
};

function flash(msg, seconds = 1.6) {
  game.message = msg;
  game.messageTimer = seconds;
}

function startRun() {
  game.state = 'play';
  game.distanceM = debugStart;
  game.scrollX = debugStart * PX_PER_M;
  game.score = 0;
  game.lives = 3;
  game.obstacles = [];
  game.pickups = [];
  game.haystacks = [];
  game.turkey = createTurkey();
  game.farmer = createFarmer();
  game.spawnTimer = 1.0;
  game.rng = mulberry32(20261127 + Math.floor(Math.random() * 1000));
  game.message = '';
  game.messageTimer = 0;
  flash(debugStart > 0 ? 'Back in the chase — run!' : 'Run, turkey, run!', 1.8);
}

function endRun(escaped) {
  game.state = escaped ? 'escaped' : 'caught';
  if (escaped) {
    sfx.escaped();
    game.score += 500;
    if (game.distanceM > game.best) {
      game.best = Math.floor(game.distanceM);
      saveBest(game.best);
    }
  } else {
    sfx.caught();
    if (game.distanceM > game.best) {
      game.best = Math.floor(game.distanceM);
      saveBest(game.best);
    }
  }
}

function stumble() {
  const t = game.turkey;
  if (t.invulnerableTimer > 0 || t.hidden) return;
  game.lives -= 1;
  t.invulnerableTimer = 1.4;
  farmerStumble(game.farmer);
  sfx.hit();
  flash(game.lives > 0 ? 'Ouch! The farmer is gaining!' : '', 1.4);
  if (game.lives <= 0 || farmerCaught(game.farmer)) endRun(false);
}

function update(dt) {
  game.time += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;

  if (game.state !== 'play') return;

  const stage = stageFor(game.distanceM);
  game.speed = speedFor(stage, game.distanceM);
  const t = game.turkey;

  // World scrolls; distance grows with it.
  game.scrollX += game.speed * dt;
  game.distanceM = game.scrollX / PX_PER_M;
  game.score += dt * 2;

  turkeyUpdate(t, dt, true);
  farmerUpdate(game.farmer, dt, game.speed);

  // Spawning: an obstacle, sometimes a pickup or a haystack beside it.
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = spawnIntervalFor(stage, game.rng);
    const kind = pickObstacle(stage, game.rng);
    game.obstacles.push(spawnObstacle(kind, GROUND_Y, game.rng));
    if (game.rng() < stage.pickups) {
      const px = 1020 + 60 + game.rng() * 120;
      game.pickups.push(spawnPickup(game.rng() < 0.85 ? 'corn' : 'feather', GROUND_Y, px));
    }
    if (game.rng() < stage.haystacks) {
      game.haystacks.push(spawnHaystack(GROUND_Y, 1020 + 200 + game.rng() * 150));
    }
  }

  // Puddle slow: standing in one halves the scroll for a beat.
  game.inPuddle = false;
  const box = turkeyHitbox(t);
  for (const ob of game.obstacles) {
    if (ob.kind === 'puddle' && box.x < ob.x + ob.w && box.x + box.w > ob.x && t.y >= GROUND_Y) {
      game.inPuddle = true;
    }
  }
  if (game.inPuddle) game.scrollX -= game.speed * dt * 0.45;

  // Move obstacles, pickups, haystacks; drop the ones left behind.
  for (const ob of game.obstacles) updateObstacle(ob, dt, game.speed, GROUND_Y);
  game.obstacles = game.obstacles.filter((o) => !obstacleOffscreen(o));
  for (const p of game.pickups) p.x -= game.speed * dt;
  game.pickups = game.pickups.filter((p) => p.x > -60 && !p.taken);
  for (const hs of game.haystacks) hs.x -= game.speed * dt;
  game.haystacks = game.haystacks.filter((hs) => hs.x + hs.w > -80);

  // Collisions with obstacles.
  for (const ob of game.obstacles) {
    if (ob.hit || ob.passed) continue;
    if (ob.x + ob.w < TURKEY_X - 30) {
      ob.passed = true;
      continue;
    }
    if (obstacleHurts(ob, box, t.sliding)) {
      ob.hit = true;
      stumble();
      if (game.state !== 'play') return;
    }
  }

  // Pickups.
  for (const p of game.pickups) {
    if (p.taken) continue;
    if (box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y) {
      p.taken = true;
      if (p.kind === 'corn') {
        game.score += 10;
        sfx.corn();
      } else {
        game.score += 50;
        if (game.lives < 3) game.lives += 1;
        farmerFeatherFallback(game.farmer);
        sfx.feather();
        flash('Golden feather! +50, the farmer loses ground!', 1.6);
      }
    }
  }

  // Haystack hiding.
  game.nearHaystack = null;
  for (const hs of game.haystacks) {
    if (!hs.used && Math.abs(hs.x + hs.w / 2 - TURKEY_X) < 95 && turkeyOnGround(t)) {
      game.nearHaystack = hs;
      break;
    }
  }

  // The farmer finally grabs the turkey.
  if (farmerCaught(game.farmer)) endRun(false);

  // Out the back door: escaped!
  if (game.distanceM >= ESCAPE_DISTANCE_M) endRun(true);
}

function drawHud() {
  ctx.fillStyle = 'rgba(43,29,18,0.72)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${Math.floor(game.score)}`, 14, 30);
  ctx.fillText(`DIST ${Math.floor(game.distanceM)}m`, 200, 30);
  // Stage label in a smaller font so the long kitchen label never runs into the hearts.
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  ctx.fillText(STAGE_ART[stageFor(game.distanceM).id].label, 372, 30);
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';

  // Lives as hearts.
  ctx.textAlign = 'right';
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < game.lives ? '♥' : '♡';
  ctx.fillStyle = '#ff6b5e';
  ctx.fillText(hearts, W - 180, 30);

  // Farmer danger meter.
  const threat = farmerThreat(game.farmer);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(W - 168, 52, 154, 12);
  ctx.fillStyle = threat > 0.66 ? '#e23b2e' : threat > 0.33 ? '#f2a007' : '#7fae3d';
  ctx.fillRect(W - 168, 52, 154 * threat, 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillText('FARMER', W - 14, 61);
  ctx.textAlign = 'left';

  if (game.messageTimer > 0 && game.message) {
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, W / 2, 96);
    ctx.textAlign = 'left';
  }
  if (game.nearHaystack && !game.turkey.hidden) {
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press H to hide in the haystack!', W / 2, 130);
    ctx.textAlign = 'left';
  }
  if (isMuted()) {
    ctx.fillStyle = '#e8c98f';
    ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillText('MUTED (M)', 14, H - 14);
  }
}

function drawTitle() {
  drawBackground(ctx, W, H, GROUND_Y, 'farmyard', game.scrollX, game.time);
  drawTurkey(ctx, 240, GROUND_Y - 30, game.time * 6, false, false);
  drawFarmer(ctx, 120, GROUND_Y, game.time * 6);

  ctx.fillStyle = 'rgba(43,29,18,0.55)';
  ctx.fillRect(0, 120, W, 240);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GOBBLE DASH', W / 2, 190);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText('The Great Turkey Escape', W / 2, 228);
  ctx.font = '18px "Trebuchet MS", sans-serif';
  ctx.fillText('Thanksgiving is coming. The farmer is coming faster. Run 1200m to the back door!', W / 2, 268);
  ctx.fillText('Jump fences and ovens · Slide under clotheslines · Dodge the carving knives', W / 2, 296);
  ctx.fillText('Grab corn, hide in haystacks (H), and do not let the farmer catch you.', W / 2, 322);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  const blink = Math.sin(game.time * 4) > -0.2 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText('— PRESS SPACE OR CLICK TO RUN —', W / 2, 352);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8c98f';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  if (game.best > 0) ctx.fillText(`Best escape so far: ${game.best}m`, W / 2, 386);
  ctx.textAlign = 'left';
}

function drawEnd(escaped) {
  ctx.fillStyle = escaped ? 'rgba(46,90,40,0.82)' : 'rgba(90,20,10,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = escaped ? '#c9f2a8' : '#ffb3a0';
  ctx.font = 'bold 58px "Trebuchet MS", sans-serif';
  ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', W / 2, 190);
  ctx.fillStyle = '#fff3d6';
  ctx.font = '22px "Trebuchet MS", sans-serif';
  ctx.fillText(
    escaped
      ? 'Out the back door and into the woods — the turkey lives to gobble another day!'
      : 'The farmer got you. Thanksgiving dinner is served… it is you.',
    W / 2, 236,
  );
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText(`Score ${Math.floor(game.score)}  ·  Distance ${Math.floor(game.distanceM)}m  ·  Best ${game.best}m`, W / 2, 286);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  const blink = Math.sin(game.time * 4) > -0.2 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText('— PRESS R OR CLICK TO RUN AGAIN —', W / 2, 340);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawPaused() {
  ctx.fillStyle = 'rgba(43,29,18,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Press P to keep running', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

function draw() {
  const stage = stageFor(game.distanceM);
  if (game.state === 'title') {
    drawTitle();
    return;
  }
  drawBackground(ctx, W, H, GROUND_Y, stage.id, game.scrollX, game.time);

  for (const hs of game.haystacks) drawHaystack(ctx, hs, game.turkey.hidden && game.nearHaystack === hs);
  for (const p of game.pickups) if (!p.taken) drawPickup(ctx, p, game.time);
  for (const ob of game.obstacles) drawObstacle(ctx, ob, game.time);

  // The farmer, then the turkey on top.
  const f = game.farmer;
  if (f.x > -90) drawFarmer(ctx, f.x, GROUND_Y, f.runPhase);
  const t = game.turkey;
  const blink = t.invulnerableTimer > 0 && Math.floor(game.time * 12) % 2 === 0;
  if (!blink) {
    const feetY = t.y - (t.sliding ? 16 : 30);
    drawTurkey(ctx, TURKEY_X, feetY, t.runPhase, t.sliding, t.hidden);
  }

  drawHud();
  if (game.state === 'caught') drawEnd(false);
  if (game.state === 'escaped') drawEnd(true);
  if (game.state === 'paused') drawPaused();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function doJump() {
  if (game.state === 'title') { startRun(); return; }
  if (game.state === 'caught' || game.state === 'escaped') { startRun(); return; }
  if (game.state !== 'play') return;
  const kind = turkeyJump(game.turkey);
  if (kind === 'jump') sfx.jump();
  if (kind === 'double') sfx.doubleJump();
}

function doSlide() {
  if (game.state === 'play') turkeySlide(game.turkey);
}

function doHide() {
  if (game.state !== 'play') return;
  if (game.nearHaystack && turkeyHide(game.turkey)) {
    game.nearHaystack.used = true;
    farmerHideFallback(game.farmer);
    sfx.hide();
    flash('Hidden! The farmer loses your trail…', 1.6);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':
    case 'ArrowUp':
    case 'KeyW':
      e.preventDefault();
      doJump();
      break;
    case 'ArrowDown':
    case 'KeyS':
      e.preventDefault();
      doSlide();
      break;
    case 'KeyH':
      doHide();
      break;
    case 'KeyM':
      toggleMute();
      break;
    case 'KeyP':
      if (game.state === 'play') game.state = 'paused';
      else if (game.state === 'paused') game.state = 'play';
      break;
    case 'KeyR':
      if (game.state === 'caught' || game.state === 'escaped' || game.state === 'paused') startRun();
      break;
    default:
      break;
  }
});

canvas.addEventListener('pointerdown', () => {
  doJump();
});

// Debug hooks for screenshots: open an end screen directly.
if (debugState === 'caught' || debugState === 'escaped') {
  game.distanceM = debugState === 'escaped' ? ESCAPE_DISTANCE_M : 320;
  game.score = debugState === 'escaped' ? 1480 : 640;
  game.state = debugState;
  game.best = Math.max(game.best, Math.floor(game.distanceM));
}

// Exposed for automated play-testing: the current state string, plus a
// read-only snapshot of the world (test hook only, never used by the game).
Object.defineProperty(window, '__gobbleState', { get: () => game.state });
Object.defineProperty(window, '__gobbleDebug', {
  get: () => ({
    state: game.state,
    distanceM: game.distanceM,
    lives: game.lives,
    score: game.score,
    turkeyY: game.turkey.y,
    obstacles: game.obstacles.map((o) => ({ kind: o.kind, x: o.x, y: o.y, w: o.w, h: o.h })),
    nearHaystack: !!game.nearHaystack,
  }),
});

requestAnimationFrame(frame);
