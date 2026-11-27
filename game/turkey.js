// turkey.js — the player: a turkey with run physics, double jump, slide and hide.
// The turkey stays near x=150 while the world scrolls; it only moves vertically
// and crouches. All numbers are tuned for a 960x540 canvas with ground at y=470.

export const GROUND_Y = 470;
export const TURKEY_X = 150;
export const GRAVITY = 2300;
export const JUMP_VELOCITY = -790;
export const DOUBLE_JUMP_VELOCITY = -680;

export function createTurkey() {
  return {
    y: GROUND_Y, // feet position
    vy: 0,
    jumps: 0, // jumps used since last landing (0, 1, 2)
    sliding: false,
    slideTimer: 0,
    hidden: false,
    hideTimer: 0,
    runPhase: 0,
    invulnerableTimer: 0,
  };
}

// Returns 'jump' | 'double' | null so the caller can play the right sound.
export function turkeyJump(t) {
  if (t.hidden || t.sliding) return null;
  if (t.y >= GROUND_Y && t.jumps === 0) {
    t.vy = JUMP_VELOCITY;
    t.jumps = 1;
    return 'jump';
  }
  if (t.jumps === 1) {
    t.vy = DOUBLE_JUMP_VELOCITY;
    t.jumps = 2;
    return 'double';
  }
  return null;
}

export function turkeySlide(t) {
  if (t.y < GROUND_Y || t.hidden) return;
  t.sliding = true;
  t.slideTimer = 0.55;
}

export function turkeyHide(t) {
  if (t.y < GROUND_Y || t.hidden) return false;
  t.hidden = true;
  t.hideTimer = 2.0;
  return true;
}

export function turkeyUpdate(t, dt, running) {
  if (t.hidden) {
    t.hideTimer -= dt;
    if (t.hideTimer <= 0) t.hidden = false;
  }
  if (t.sliding) {
    t.slideTimer -= dt;
    if (t.slideTimer <= 0) t.sliding = false;
  }
  if (t.invulnerableTimer > 0) t.invulnerableTimer -= dt;

  // Gravity and landing.
  t.vy += GRAVITY * dt;
  t.y += t.vy * dt;
  if (t.y >= GROUND_Y) {
    t.y = GROUND_Y;
    t.vy = 0;
    t.jumps = 0;
  }
  if (running && t.y >= GROUND_Y && !t.sliding) t.runPhase += dt * 14;
}

// Hitbox: narrower than the drawing so near-misses feel fair.
export function turkeyHitbox(t) {
  const w = t.sliding ? 52 : 40;
  const h = t.sliding ? 26 : 52;
  const top = t.y - (t.sliding ? 26 : 52);
  return { x: TURKEY_X - w / 2, y: top, w, h };
}

export function turkeyOnGround(t) {
  return t.y >= GROUND_Y;
}
