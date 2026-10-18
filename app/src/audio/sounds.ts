import { SOUND_HORN_RANGE, SOUND_RANGE } from '../shared/config';
import type { PlayerId, Snapshot, World } from '../shared/types';
import { createCaptureTracker, diffSnapshots, distanceGain, weatherExposure, type SoundEvent } from './events';
import { createSynth } from './synth';

type Pos = { x: number; z: number };

/**
 * Game sounds from snapshot differences (only reads state). `update` once per frame with the
 * latest snapshot and where the local player is (camera target) as the listener.
 */
export function createSounds(world: World, me: PlayerId) {
  const synth = createSynth();
  const captures = createCaptureTracker(world.tiles, world.size);
  let prev: Snapshot | null = null;

  function play(e: SoundEvent, listener: Pos | undefined) {
    const d = listener ? Math.hypot(e.x - listener.x, e.z - listener.z) : 0;
    const gain = distanceGain(d, e.kind === 'horn' ? SOUND_HORN_RANGE : SOUND_RANGE);
    switch (e.kind) {
      case 'horn': return synth.horn(gain);
      // Own jump is always loud, even when the tiles' centre is a bit away.
      case 'capture': return synth.capture(e.tiles, e.mine ? 1 : gain * 0.6);
      case 'ram': return synth.ram(gain);
      case 'bonus': return synth.bonus(gain);
      case 'controller': return synth.controller(gain);
    }
  }

  return {
    update(snap: Snapshot, listener: Pos | undefined, dt: number) {
      if (snap !== prev) {
        const events = prev ? diffSnapshots(prev, snap, me) : [];
        events.push(...captures.diff(world.tiles, me));
        for (const e of events) play(e, listener);
        prev = snap;
      }
      const w = listener ? weatherExposure(snap.weather ?? [], listener.x, listener.z, snap.time) : { rain: 0, harnas: 0 };
      synth.weather(w.rain, w.harnas, dt);
    },
    /** Own horn plays right away, not after the server round trip. */
    honk() {
      synth.horn(1);
    },
    /** Mute toggle for the HUD, remembered in localStorage. */
    muteButton(): HTMLButtonElement {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mute icon';
      btn.title = btn.ariaLabel = 'Dźwięk';
      const render = () => {
        btn.textContent = synth.muted() ? '🔇' : '🔊';
        btn.setAttribute('aria-pressed', String(synth.muted()));
      };
      btn.onclick = () => {
        synth.setMuted(!synth.muted());
        render();
        btn.blur();
      };
      render();
      return btn;
    },
  };
}
