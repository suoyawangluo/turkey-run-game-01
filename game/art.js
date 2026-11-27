// art.js — all of Gobble Dash's drawing: parallax scenery, the turkey, the farmer.
// Everything is drawn with canvas paths, no image files, so the game loads offline.

// Stage palettes: [sky top, sky bottom, ground, ground dark, accent]
export const STAGE_ART = {
  farmyard: { skyTop: '#8ec9ee', skyBot: '#fde9b8', ground: '#8a6b3a', groundDark: '#6e5329', accent: '#c96a2b', label: 'THE FARMYARD' },
  barn: { skyTop: '#7fb3d8', skyBot: '#f6cf8e', ground: '#7d5a30', groundDark: '#5f4423', accent: '#a03d2d', label: 'THE BARN' },
  kitchen: { skyTop: '#e8b04b', skyBot: '#f3d9a4', ground: '#9c6644', groundDark: '#7c4f33', accent: '#b3372e', label: 'THE KITCHEN — 300m TO FREEDOM' },
};

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBackground(ctx, w, h, groundY, stage, scrollX, time) {
  const pal = STAGE_ART[stage];
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(1, pal.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY);

  // Sun with a slow wobble, clouds drifting on their own slow layer.
  ctx.fillStyle = '#ffd94d';
  circle(ctx, 830, 70 + Math.sin(time / 900) * 4, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, s] of [[150, 80, 1], [420, 55, 0.7], [690, 110, 0.85]]) {
    const x = ((cx - scrollX * 0.08) % (w + 240) + w + 240) % (w + 240) - 120;
    ellipse(ctx, x, cy, 46 * s, 16 * s);
    ellipse(ctx, x + 26 * s, cy + 6, 34 * s, 13 * s);
    ellipse(ctx, x - 28 * s, cy + 7, 30 * s, 12 * s);
  }

  // Far hills, then near trees / fences scrolling at different speeds.
  // The kitchen has a tiled back wall instead of the open farm.
  if (stage === 'kitchen') {
    ctx.fillStyle = '#d9a05b';
    ctx.fillRect(0, groundY - 168, w, 168);
    ctx.strokeStyle = 'rgba(122,74,33,0.5)';
    ctx.lineWidth = 2;
    for (let y = groundY - 168; y < groundY; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = -((scrollX * 0.2) % 56); x < w; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, groundY - 168);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#7fae62';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 60) {
      const hx = x - (scrollX * 0.15 % 120);
      ctx.lineTo(hx, groundY - 46 - Math.sin((x + scrollX * 0.15) / 130) * 18);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5d8a45';
    for (let i = 0; i < 5; i++) {
      const tx = ((i * 260 - scrollX * 0.35) % (w + 200) + w + 200) % (w + 200) - 100;
      ctx.fillRect(tx, groundY - 74, 10, 74);
      circle(ctx, tx + 5, groundY - 92, 30);
      circle(ctx, tx - 18, groundY - 72, 20);
      circle(ctx, tx + 26, groundY - 74, 22);
    }
  }

  if (stage === 'kitchen') {
    // Kitchen windows and hanging pots on the back wall.
    ctx.fillStyle = '#b3372e';
    ctx.fillRect(0, groundY - 150, w, 10);
    for (let i = 0; i < 4; i++) {
      const wx = 90 + i * 230;
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(wx, groundY - 138, 90, 70);
      ctx.strokeStyle = '#7a4a21';
      ctx.lineWidth = 4;
      ctx.strokeRect(wx, groundY - 138, 90, 70);
      ctx.beginPath();
      ctx.moveTo(wx + 45, groundY - 138);
      ctx.lineTo(wx + 45, groundY - 68);
      ctx.moveTo(wx, groundY - 103);
      ctx.lineTo(wx + 90, groundY - 103);
      ctx.stroke();
    }
  } else {
    // Farmhouse and barn silhouettes in the mid distance.
    ctx.fillStyle = stage === 'barn' ? '#8e3b2f' : '#a34a28';
    const bx = ((720 - scrollX * 0.25) % (w + 500) + w + 500) % (w + 500) - 250;
    ctx.fillRect(bx, groundY - 110, 150, 110);
    ctx.beginPath();
    ctx.moveTo(bx - 12, groundY - 110);
    ctx.lineTo(bx + 75, groundY - 158);
    ctx.lineTo(bx + 162, groundY - 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7d9a0';
    ctx.fillRect(bx + 58, groundY - 58, 34, 58);
  }

  // Ground: two-tone earth with scrolling tufts.
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = pal.groundDark;
  ctx.fillRect(0, groundY, w, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 14; i++) {
    const gx = ((i * 97 - scrollX) % (w + 120) + w + 120) % (w + 120) - 60;
    ctx.fillRect(gx, groundY + 26 + (i % 3) * 12, 22, 4);
  }
}

// The turkey: brown body, fanned tail, red wattle, orange beak, running legs.
// `runPhase` animates the legs; `slide` flattens the body; `hidden` draws it sunk into a haystack.
export function drawTurkey(ctx, x, y, runPhase, slide, hidden) {
  ctx.save();
  ctx.translate(x, y);
  if (hidden) ctx.globalAlpha = 0.25;
  if (slide) ctx.scale(1.25, 0.62);

  // Tail fan: five feathers spread from the tail base.
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(-22, -4);
    ctx.rotate(i * 0.42);
    ctx.fillStyle = i % 2 === 0 ? '#8a5a2b' : '#a06a33';
    ellipse(ctx, 0, -20, 8, 20);
    ctx.fillStyle = '#c98a3d';
    ellipse(ctx, 0, -30, 4, 8);
    ctx.restore();
  }

  // Body and wing.
  ctx.fillStyle = '#7a4a21';
  ellipse(ctx, 0, 0, 26, 20);
  ctx.fillStyle = '#5d3616';
  const wingSwing = Math.sin(runPhase) * 5;
  ellipse(ctx, -4, -2 + wingSwing * 0.3, 15, 10);

  // Legs, animated.
  ctx.strokeStyle = '#e8912d';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const legA = Math.sin(runPhase) * 10;
  const legB = Math.sin(runPhase + Math.PI) * 10;
  ctx.beginPath();
  ctx.moveTo(-8, 16);
  ctx.lineTo(-8 + legA, 30);
  ctx.moveTo(8, 16);
  ctx.lineTo(8 + legB, 30);
  ctx.stroke();

  // Head, beak, wattle, eye.
  ctx.fillStyle = '#8a5a2b';
  circle(ctx, 20, -24, 13);
  ctx.fillStyle = '#e8912d';
  ctx.beginPath();
  ctx.moveTo(30, -27);
  ctx.lineTo(44, -22);
  ctx.lineTo(30, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ellipse(ctx, 26, -12, 4, 8);
  ctx.fillStyle = '#1a1a1a';
  circle(ctx, 24, -27, 2.5);
  ctx.restore();
}

// The farmer: straw hat, red shirt, blue overalls, pitchfork, very cross.
export function drawFarmer(ctx, x, y, runPhase) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.abs(Math.sin(runPhase)) * 4;
  ctx.translate(0, -bob);

  // Legs.
  ctx.strokeStyle = '#2e4a7a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const legA = Math.sin(runPhase) * 12;
  const legB = Math.sin(runPhase + Math.PI) * 12;
  ctx.beginPath();
  ctx.moveTo(-8, -34);
  ctx.lineTo(-8 + legA, 0);
  ctx.moveTo(8, -34);
  ctx.lineTo(8 + legB, 0);
  ctx.stroke();

  // Overalls and shirt.
  ctx.fillStyle = '#2e4a7a';
  ctx.fillRect(-16, -78, 32, 48);
  ctx.fillStyle = '#b3372e';
  ctx.fillRect(-18, -96, 36, 24);
  ctx.fillStyle = '#f4e3c2';
  circle(ctx, 0, -104, 13);

  // Straw hat.
  ctx.fillStyle = '#e8c96a';
  ellipse(ctx, 0, -112, 24, 6);
  ctx.fillRect(-12, -126, 24, 14);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-12, -116, 24, 4);

  // Angry eyes and moustache.
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -108);
  ctx.lineTo(-2, -105);
  ctx.moveTo(9, -108);
  ctx.lineTo(2, -105);
  ctx.stroke();
  ctx.fillStyle = '#6e4a21';
  ellipse(ctx, 0, -97, 7, 3);

  // Pitchfork, held high.
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(20, -40);
  ctx.lineTo(34, -128);
  ctx.stroke();
  ctx.strokeStyle = '#c0c0c0';
  ctx.lineWidth = 3;
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(34 + dx, -128);
    ctx.lineTo(34 + dx, -146);
    ctx.stroke();
  }
  ctx.restore();
}
