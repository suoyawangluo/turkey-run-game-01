// audio.js — all sounds are synthesized with the Web Audio API, no audio files.
// A tiny synth: short oscillator blips with an envelope, plus a mute toggle.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(freqFrom, freqTo, duration, type, volume) {
  if (muted) return;
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

export const sfx = {
  jump() { blip(280, 620, 0.16, 'square', 0.10); },
  doubleJump() { blip(420, 900, 0.14, 'square', 0.09); },
  corn() { blip(880, 1320, 0.10, 'sine', 0.14); },
  feather() { blip(660, 660, 0.09, 'sine', 0.12); setTimeout(() => blip(990, 990, 0.12, 'sine', 0.12), 90); },
  hit() { blip(220, 70, 0.25, 'sawtooth', 0.16); },
  hide() { blip(500, 300, 0.18, 'triangle', 0.10); },
  caught() {
    blip(392, 392, 0.16, 'sawtooth', 0.14);
    setTimeout(() => blip(311, 311, 0.16, 'sawtooth', 0.14), 160);
    setTimeout(() => blip(233, 110, 0.4, 'sawtooth', 0.16), 320);
  },
  escaped() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => blip(n, n, 0.22, 'triangle', 0.14), i * 130));
  },
};
