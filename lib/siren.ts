// The Sirens' song: an original, wordless melody synthesized live in the browser with the Web
// Audio API. No recordings or samples, so there is nothing to license. Two "voices" (sawtooth
// through vowel formant filters, with slow vibrato) sing a drifting D minor line in thirds over a
// low drone and the hiss of the sea, all washed through a long reverb.

type Ctx = AudioContext;

let ctx: Ctx | null = null;

/** Create or resume the audio context. Call from a click so browsers allow sound later. */
export function unlockAudio(): Ctx | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// D minor, MIDI note numbers. [note, beats]. An original phrase: rising call, a hanging
// question, then a slow fall back to the tonic.
const MELODY: [number, number][] = [
  [62, 2], [65, 1], [69, 3], [67, 1], [65, 1], [64, 2], [62, 4],
  [69, 2], [70, 1], [72, 3], [70, 1], [69, 1], [67, 2], [69, 4],
  [74, 2], [72, 1], [70, 2], [69, 1], [67, 2], [65, 1], [64, 1], [65, 2], [62, 6],
];
const BEAT = 0.62; // seconds

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// a third below the melody, kept inside D minor
const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77];
const below = (m: number) => {
  const i = SCALE.indexOf(m);
  return i >= 2 ? SCALE[i - 2] : m - 3;
};

function reverb(c: Ctx, seconds = 4.5): ConvolverNode {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** One sung voice: a sawtooth shaped into an "ah" by three formant filters, with vibrato. */
function voice(c: Ctx, out: AudioNode, gainLevel: number, pan: number) {
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  const vib = c.createOscillator();
  vib.frequency.value = 5.2;
  const vibAmt = c.createGain();
  vibAmt.gain.value = 0;
  vib.connect(vibAmt).connect(osc.frequency);
  const amp = c.createGain();
  amp.gain.value = 0;
  const sum = c.createGain();
  sum.gain.value = gainLevel;
  // "ah" formants for a high voice
  for (const [f, q, g] of [[800, 8, 1], [1150, 9, 0.5], [2900, 12, 0.25]] as const) {
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = q;
    const fg = c.createGain();
    fg.gain.value = g;
    osc.connect(bp).connect(fg).connect(amp);
  }
  const p = c.createStereoPanner();
  p.pan.value = pan;
  amp.connect(sum).connect(p).connect(out);
  osc.start();
  vib.start();
  return {
    sing(midi: number, at: number, dur: number) {
      const f = hz(midi);
      osc.frequency.setTargetAtTime(f, at, 0.06); // a little glide between notes
      vibAmt.gain.setValueAtTime(0, at);
      vibAmt.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.6, dur * 0.5));
      amp.gain.setTargetAtTime(1, at, 0.12);
      amp.gain.setTargetAtTime(0.35, at + dur - 0.15, 0.08);
    },
    rest(at: number) {
      amp.gain.setTargetAtTime(0, at, 0.3);
    },
    stop(at: number) {
      osc.stop(at);
      vib.stop(at);
    },
  };
}

/** The sea: filtered noise that swells and falls like waves. */
function sea(c: Ctx, out: AudioNode) {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  const g = c.createGain();
  g.gain.value = 0.05;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoAmt = c.createGain();
  lfoAmt.gain.value = 0.04;
  lfo.connect(lfoAmt).connect(g.gain);
  src.connect(lp).connect(g).connect(out);
  src.start();
  lfo.start();
  return (at: number) => {
    src.stop(at);
    lfo.stop(at);
  };
}

function drone(c: Ctx, out: AudioNode) {
  const stops: ((at: number) => void)[] = [];
  for (const [m, lvl] of [[38, 0.05], [45, 0.03]] as const) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz(m);
    const g = c.createGain();
    g.gain.value = lvl;
    o.connect(g).connect(out);
    o.start();
    stops.push((at) => o.stop(at));
  }
  return (at: number) => stops.forEach((s) => s(at));
}

export interface SirenSong {
  stop: (fadeSeconds?: number) => void;
}

/** Start the Sirens singing. It fades in, loops until stopped, and fades out on stop. */
export function singSirens(volume = 0.5): SirenSong | null {
  const c = unlockAudio();
  if (!c) return null;
  const master = c.createGain();
  master.gain.value = 0;
  master.gain.setTargetAtTime(volume, c.currentTime, 1.2);
  master.connect(c.destination);
  const wet = c.createGain();
  wet.gain.value = 0.55;
  const verb = reverb(c);
  const bus = c.createGain();
  bus.gain.value = 3.5; // the formant filters take a lot of level out
  bus.connect(master);
  bus.connect(verb).connect(wet).connect(master);

  const lead = voice(c, bus, 0.22, -0.25);
  const harm = voice(c, bus, 0.13, 0.3);
  const stopSea = sea(c, master);
  const stopDrone = drone(c, bus);

  const phrase = MELODY.reduce((t, [, b]) => t + b * BEAT, 0) + 2.5; // a breath between loops
  let next = c.currentTime + 0.8;
  const schedule = () => {
    // keep about one phrase scheduled ahead
    while (next < c.currentTime + phrase) {
      let t = next;
      MELODY.forEach(([m, b], i) => {
        const dur = b * BEAT;
        lead.sing(m, t, dur);
        // the second Siren joins on the longer notes
        if (b >= 2 || i === MELODY.length - 1) harm.sing(below(m), t + 0.05, dur);
        else harm.rest(t);
        t += dur;
      });
      lead.rest(t);
      harm.rest(t);
      next += phrase;
    }
  };
  schedule();
  const timer = setInterval(schedule, 1000);

  let stopped = false;
  return {
    stop(fade = 1.2) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      const at = c.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(master.gain.value, at);
      master.gain.linearRampToValueAtTime(0, at + fade);
      const end = at + fade + 0.1;
      lead.stop(end);
      harm.stop(end);
      stopSea(end);
      stopDrone(end);
      setTimeout(() => master.disconnect(), (fade + 0.3) * 1000);
    },
  };
}
