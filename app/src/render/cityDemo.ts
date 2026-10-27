// Standalone city viewer: `npm run dev`, then open /demo-city.html (?seed=N, ?at=x,z puts the bus
// there, ?osm = real Warsaw streets from OpenStreetMap, card 014). Drive with the arrows or WASD through a local sim, no server.
// C switches the camera (?kamera=chase|cockpit|eyes). `?shot` swaps the canvas for
// a still image after a moment, for headless screenshots. Not part of the game.
import '../style.css';
import type { BusInput } from '../shared/types';
import { addPlayer, createGame, stepGame } from '../sim/game';
import { createScene } from './scene';
import { createCameraMode } from './camera';
import { createBonusesRender } from './bonuses';
import { createZulRender } from './zul';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 1);
const state = createGame(seed, true, params.has('osm') || undefined);
const me = addPlayer(state, 'me', 'Ja');
const at = params.get('at')?.split(',').map(Number);
const mine = state.buses.find((b) => b.id === me.busId);
if (at && mine) Object.assign(mine, { x: at[0], z: at[1], angle: Number(params.get('angle') ?? 0) });
const canvas = document.getElementById('game') as HTMLCanvasElement;
const view = createScene(canvas, state.world);
const cameraMode = createCameraMode();
const bonuses = createBonusesRender(view.scene);
const zuls = createZulRender(view.scene);
// Dev handle for poking at the local sim from the console.
(window as unknown as { demo: typeof state }).demo = state;

const keys = new Set<string>();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
const input = (): BusInput => ({
  throttle: (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0),
  steer: (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0),
});

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const move = input();
  stepGame(state, new Map([['me', move]]), dt);
  const bus = state.buses.find((b) => b.id === me.busId);
  bonuses.update(state.bonuses ?? [], dt, state.time);
  zuls.update(state.bonuses ?? [], state.time, dt);
  view.render(state.buses, state.players, bus, dt, state.time, { mode: cameraMode.mode, bus: bus ?? null, steer: move.steer });
  requestAnimationFrame(frame);
}
if (params.has('shot')) {
  // Settle the camera with a few synchronous frames, then freeze the picture.
  for (let k = 0; k < 120; k++) view.render(state.buses, state.players, mine, 1 / 30, 0, { mode: cameraMode.mode, bus: mine ?? null, steer: 0 });
  const img = new Image();
  img.src = canvas.toDataURL();
  img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  document.body.append(img);
} else requestAnimationFrame(frame);
