// farmer.js — the chaser. The farmer starts off-screen left and gains ground
// every time the turkey stumbles; he falls back when the turkey hides or grabs
// a golden feather. If he reaches the turkey, the run is over: caught.

export const FARMER_CATCH_X = 118; // reaching this x means the farmer grabs the turkey

export function createFarmer() {
  return {
    x: -90, // starts off-screen left
    runPhase: 0,
    gainPerStumble: 62,
    fallbackPerHide: 95,
    fallbackPerFeather: 45,
  };
}

export function farmerStumble(f) {
  f.x += f.gainPerStumble;
}

export function farmerHideFallback(f) {
  f.x = Math.max(-90, f.x - f.fallbackPerHide);
}

export function farmerFeatherFallback(f) {
  f.x = Math.max(-90, f.x - f.fallbackPerFeather);
}

export function farmerUpdate(f, dt, speed) {
  // The farmer keeps pace with the run; he never drifts back on his own.
  f.runPhase += dt * (6 + speed / 60);
}

// 0 = far away, 1 = about to catch you. Drives the danger meter in the HUD.
export function farmerThreat(f) {
  const span = FARMER_CATCH_X - (-90);
  return Math.max(0, Math.min(1, (f.x + 90) / span));
}

export function farmerCaught(f) {
  return f.x >= FARMER_CATCH_X;
}
