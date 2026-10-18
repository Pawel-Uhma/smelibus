import { SOUND_CLINKS_PER_S, SOUND_VOLUME } from '../shared/config';
import { captureChord } from './events';

const MUTE_KEY = 'smelibus.muted';

function loadMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
function saveMuted(m: boolean) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* private mode */ }
}

export interface Synth {
  muted(): boolean;
  setMuted(m: boolean): void;
  horn(gain: number): void;
  capture(tiles: number, gain: number): void;
  ram(gain: number): void;
  bonus(gain: number): void;
  controller(gain: number): void;
  /** Ambient under clouds, 0..1 each; call every frame. */
  weather(rain: number, harnas: number, dt: number): void;
}

/**
 * Every sound is made from oscillators and noise, no audio files. The AudioContext is created
 * on the first click / key press / touch (browser autoplay policy); until then all calls are no-ops.
 */
export function createSynth(target: Window = window): Synth {
  let muted = loadMuted();
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let rainGain: GainNode | null = null;

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return;
    }
    const w = target as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ac = new Ctor();
    ctx = ac;
    const comp = ac.createDynamicsCompressor();
    comp.connect(ac.destination);
    master = ac.createGain();
    master.gain.value = muted ? 0 : SOUND_VOLUME;
    master.connect(comp);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Rain: looping noise through a band-pass, its volume follows the cloud exposure.
    const src = ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.6;
    rainGain = ac.createGain();
    rainGain.gain.value = 0;
    src.connect(band).connect(rainGain).connect(master);
    src.start();
    if (ac.state === 'suspended') void ac.resume();
  }
  for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
    target.addEventListener(type, start, { capture: true, passive: true });
  }
  // The lobby clicks usually already count as a user gesture, so this often starts at once.
  start();

  /** An oscillator note with a quick attack and exponential release, into master. */
  function tone(type: OscillatorType, freq: number, at: number, dur: number, gain: number, endFreq?: number, filter?: number) {
    if (!ctx || !master || gain <= 0.001) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let out: AudioNode = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      out = f;
    }
    out.connect(g).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** A burst of filtered noise. */
  function hiss(at: number, dur: number, gain: number, type: BiquadFilterType, freq: number) {
    if (!ctx || !master || !noise || gain <= 0.001) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(master);
    src.start(at, Math.random());
    src.stop(at + dur + 0.05);
  }

  const now = () => ctx?.currentTime ?? 0;

  return {
    muted: () => muted,
    setMuted(m) {
      muted = m;
      saveMuted(m);
      if (ctx && master) master.gain.setTargetAtTime(m ? 0 : SOUND_VOLUME, ctx.currentTime, 0.02);
    },
    horn(gain) {
      // Two-tone bus horn: two slightly detuned saws a third apart, through a low-pass.
      const t = now();
      for (const f of [311, 392]) {
        tone('sawtooth', f, t, 0.5, 0.18 * gain, undefined, 1800);
        tone('sawtooth', f * 1.006, t, 0.5, 0.1 * gain, undefined, 1800);
      }
    },
    capture(tiles, gain) {
      const t = now();
      captureChord(tiles).forEach((f, i) => {
        tone('triangle', f, t + i * 0.07, 0.55, 0.22 * gain);
        tone('square', f * 2, t + i * 0.07, 0.25, 0.03 * gain, undefined, 3000);
      });
    },
    ram(gain) {
      // Dull "bum": a sine thump falling in pitch plus a short low noise hit.
      const t = now();
      tone('sine', 140, t, 0.35, 0.6 * gain, 38);
      hiss(t, 0.18, 0.35 * gain, 'lowpass', 500);
    },
    bonus(gain) {
      // "Blup": a quick upward sine bubble.
      const t = now();
      tone('sine', 320, t, 0.13, 0.35 * gain, 900);
      tone('sine', 520, t + 0.07, 0.1, 0.2 * gain, 1300);
    },
    controller(gain) {
      // Sad "bzzt": two falling buzzy notes, like a wrong-answer buzzer.
      const t = now();
      tone('sawtooth', 165, t, 0.2, 0.2 * gain, 150, 1200);
      tone('sawtooth', 123, t + 0.2, 0.45, 0.22 * gain, 98, 1000);
      tone('square', 124, t + 0.2, 0.45, 0.06 * gain, 99, 800);
    },
    weather(rain, harnas, dt) {
      if (!ctx || !rainGain) return;
      rainGain.gain.setTargetAtTime(0.35 * rain, ctx.currentTime, 0.3);
      // Harnaś: random metallic can clinks, more often the deeper under the cloud.
      if (Math.random() < SOUND_CLINKS_PER_S * harnas * dt) {
        const t = now() + Math.random() * 0.05;
        const f = 1800 + Math.random() * 1600;
        const g = 0.06 + Math.random() * 0.06;
        tone('sine', f, t, 0.12, g);
        tone('sine', f * 2.76, t, 0.06, g * 0.5);
      }
    },
  };
}
