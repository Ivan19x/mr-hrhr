// Tiny WebAudio blips so the app needs no audio files offline.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", delay = 0, gain = 0.06) {
  if (!enabled || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    // Audio unavailable — stay silent.
  }
}

export const sfx = {
  click: () => tone(660, 0.05, "square", 0, 0.03),
  mark: () => tone(880, 0.08, "triangle"),
  trade: () => {
    tone(520, 0.08, "triangle");
    tone(780, 0.12, "triangle", 0.08);
  },
  win: () => [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.18, "triangle", k * 0.09)),
  lose: () => {
    tone(300, 0.2, "sawtooth", 0, 0.04);
    tone(200, 0.3, "sawtooth", 0.15, 0.04);
  },
  star: () => tone(1320, 0.12, "sine", 0, 0.05),
};
