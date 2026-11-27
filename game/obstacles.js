// obstacles.js — everything the turkey must dodge, slide under or collect:
// fences and hay bales to jump, clotheslines to slide under, ovens and falling
// knives in the kitchen, puddles that slow you, corn to collect, golden
// feathers for a bonus, and haystacks to hide in. All drawn with canvas paths.

export const SPAWN_X = 1020;

// An obstacle: { kind, x, y, w, h, ... } with y = top edge. Ground objects sit
// on GROUND_Y; falling knives drop from the sky.
export function spawnObstacle(kind, groundY, rng) {
  const base = { kind, x: SPAWN_X, passed: false, hit: false };
  switch (kind) {
    case 'fence':
      return { ...base, y: groundY - 44, w: 30, h: 44 };
    case 'haybale':
      return { ...base, y: groundY - 52, w: 54, h: 52 };
    case 'clothesline':
      // A low bar at head height: slide under it. Jumping into it hurts.
      return { ...base, y: groundY - 58, w: 26, h: 58 };
    case 'oven':
      return { ...base, y: groundY - 66, w: 64, h: 66 };
    case 'knife-ground':
      return { ...base, y: groundY - 30, w: 14, h: 30, spin: rng() * Math.PI * 2 };
    case 'knife-fall':
      return { ...base, y: -40, w: 16, h: 52, vy: 420 + rng() * 160, targetX: SPAWN_X };
    case 'puddle':
      return { ...base, y: groundY - 8, w: 84, h: 8, slow: true };
    default:
      return { ...base, y: groundY - 40, w: 30, h: 40 };
  }
}

export function spawnPickup(kind, groundY, x) {
  if (kind === 'corn') return { kind, x, y: groundY - 96, w: 26, h: 26, taken: false };
  return { kind: 'feather', x, y: groundY - 130, w: 30, h: 30, taken: false };
}

export function spawnHaystack(groundY, x) {
  return { kind: 'haystack', x, y: groundY - 64, w: 74, h: 64, used: false };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Move everything with the world. Returns true when a falling knife has landed.
export function updateObstacle(ob, dt, speed, groundY) {
  if (ob.kind === 'knife-fall') {
    ob.y += ob.vy * dt;
    if (ob.y + ob.h >= groundY) {
      ob.y = groundY - ob.h;
      ob.landed = true;
      return true;
    }
    return false;
  }
  ob.x -= speed * dt;
  if (ob.kind === 'knife-ground') ob.spin += dt * 9;
  return false;
}

export function obstacleOffscreen(ob) {
  return ob.x + ob.w < -80;
}

// A clothesline only hurts a turkey that is NOT sliding (it is head-height).
// A puddle never hurts. Everything else hurts on contact.
export function obstacleHurts(ob, turkeyBox, sliding) {
  if (ob.kind === 'puddle') return false;
  if (ob.kind === 'clothesline' && sliding) return false;
  if (ob.kind === 'knife-fall' && !ob.landed) {
    // A falling knife hurts only while it is still in the air at body height.
    const body = { x: turkeyBox.x, y: turkeyBox.y, w: turkeyBox.w, h: turkeyBox.h };
    return rectsOverlap({ x: ob.x, y: ob.y, w: ob.w, h: ob.h }, body);
  }
  return rectsOverlap({ x: ob.x, y: ob.y, w: ob.w, h: ob.h }, turkeyBox);
}

export function pickupHitbox(p) {
  return { x: p.x - 4, y: p.y - 4, w: p.w + 8, h: p.h + 8 };
}

// --- Drawing ---------------------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawObstacle(ctx, ob, time) {
  ctx.save();
  switch (ob.kind) {
    case 'fence': {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(ob.x, ob.y + 6, 4, ob.h - 6);
      ctx.fillRect(ob.x + ob.w - 4, ob.y + 6, 4, ob.h - 6);
      ctx.fillRect(ob.x - 4, ob.y + 10, ob.w + 8, 6);
      ctx.fillRect(ob.x - 4, ob.y + 26, ob.w + 8, 6);
      break;
    }
    case 'haybale': {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a87c22';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2 - 7, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'clothesline': {
      // Two poles and a sagging line with a shirt flapping on it.
      ctx.strokeStyle = '#6e4a21';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ob.x, ob.y + ob.h);
      ctx.lineTo(ob.x, ob.y);
      ctx.moveTo(ob.x + ob.w, ob.y + ob.h);
      ctx.lineTo(ob.x + ob.w, ob.y);
      ctx.stroke();
      ctx.strokeStyle = '#4a3220';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ob.x, ob.y + 4);
      ctx.quadraticCurveTo(ob.x + ob.w / 2, ob.y + 14, ob.x + ob.w, ob.y + 4);
      ctx.stroke();
      ctx.fillStyle = '#e8e4d8';
      const flap = Math.sin(time / 160) * 3;
      ctx.fillRect(ob.x + 4, ob.y + 12 + flap, 18, 22);
      break;
    }
    case 'oven': {
      ctx.fillStyle = '#3a3a3a';
      rr(ctx, ob.x, ob.y, ob.w, ob.h, 6);
      ctx.fill();
      ctx.fillStyle = '#ff7b2d';
      rr(ctx, ob.x + 8, ob.y + 10, ob.w - 16, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(ob.x + 16, ob.y + 26);
      ctx.lineTo(ob.x + 24, ob.y + 12);
      ctx.lineTo(ob.x + 30, ob.y + 26);
      ctx.lineTo(ob.x + 38, ob.y + 12);
      ctx.lineTo(ob.x + 46, ob.y + 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ob.x + 10, ob.y + 40, ob.w - 20, 4);
      ctx.fillRect(ob.x + 10, ob.y + 50, ob.w - 20, 4);
      break;
    }
    case 'knife-ground':
    case 'knife-fall': {
      ctx.translate(ob.x + ob.w / 2, ob.y + ob.h / 2);
      ctx.rotate(ob.kind === 'knife-ground' ? ob.spin : 0.5);
      ctx.fillStyle = '#dfe6ea';
      ctx.beginPath();
      ctx.moveTo(-7, -24);
      ctx.lineTo(7, -24);
      ctx.lineTo(2, 8);
      ctx.lineTo(-2, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(-4, 8, 8, 14);
      break;
    }
    case 'puddle': {
      ctx.fillStyle = 'rgba(90,140,200,0.75)';
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + 4, ob.w / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

export function drawPickup(ctx, p, time) {
  const bob = Math.sin(time / 240 + p.x / 40) * 4;
  ctx.save();
  if (p.kind === 'corn') {
    ctx.translate(p.x + 13, p.y + 13 + bob);
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 13, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fae3d';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-7, -22);
    ctx.lineTo(2, -16);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.translate(p.x + 15, p.y + 15 + bob);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 15, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.ellipse(2, -2, 3, 9, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawHaystack(ctx, hs, hidden) {
  ctx.save();
  ctx.globalAlpha = hidden ? 0.55 : 1;
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.moveTo(hs.x, hs.y + hs.h);
  ctx.quadraticCurveTo(hs.x + hs.w / 2, hs.y - 14, hs.x + hs.w, hs.y + hs.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a87c22';
  ctx.lineWidth = 2;
  for (const f of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(hs.x + hs.w * f, hs.y + hs.h);
    ctx.quadraticCurveTo(hs.x + hs.w * f - 6, hs.y + hs.h * 0.4, hs.x + hs.w * f, hs.y + 4);
    ctx.stroke();
  }
  ctx.restore();
}
