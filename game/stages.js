// stages.js — the three legs of the escape: farmyard, barn, kitchen.
// Each stage has its own obstacle mix, spawn rhythm and speed, so the run
// keeps getting harder until the back door at 1200 metres.

export const ESCAPE_DISTANCE_M = 1200;

export const STAGES = [
  {
    id: 'farmyard',
    fromM: 0,
    toM: 400,
    baseSpeed: 260,
    spawnEveryS: [1.15, 1.7],
    obstacles: ['fence', 'fence', 'haybale', 'puddle', 'fence', 'haybale'],
    pickups: 0.55,
    haystacks: 0.10,
  },
  {
    id: 'barn',
    fromM: 400,
    toM: 900,
    baseSpeed: 320,
    spawnEveryS: [0.95, 1.45],
    obstacles: ['fence', 'haybale', 'clothesline', 'knife-ground', 'haybale', 'fence'],
    pickups: 0.5,
    haystacks: 0.14,
  },
  {
    id: 'kitchen',
    fromM: 900,
    toM: ESCAPE_DISTANCE_M,
    baseSpeed: 380,
    spawnEveryS: [0.8, 1.25],
    obstacles: ['oven', 'knife-fall', 'clothesline', 'oven', 'knife-ground', 'knife-fall'],
    pickups: 0.45,
    haystacks: 0.08,
  },
];

export function stageFor(distanceM) {
  for (const s of STAGES) {
    if (distanceM < s.toM) return s;
  }
  return STAGES[STAGES.length - 1];
}

// Speed grows inside a stage too, so the last metres of each leg feel faster.
export function speedFor(stage, distanceM) {
  const inStage = (distanceM - stage.fromM) / (stage.toM - stage.fromM);
  return stage.baseSpeed + inStage * 55;
}

export function spawnIntervalFor(stage, rng) {
  const [lo, hi] = stage.spawnEveryS;
  return lo + rng() * (hi - lo);
}

export function pickObstacle(stage, rng) {
  return stage.obstacles[Math.floor(rng() * stage.obstacles.length)];
}

// A tiny deterministic RNG (mulberry32) so a screenshot run can be replayed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
