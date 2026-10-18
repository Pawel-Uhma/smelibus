import './style.css';
import { createKeyboard } from './input/keyboard';
import { lerpAngle } from './net/client';
import { createScene } from './render/scene';
import { SIM_DT } from './shared/config';
import type { Bus } from './shared/types';
import { updateBus } from './sim/bus';
import { createHud } from './ui/hud';
import { showLobby } from './ui/lobby/lobby';

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('game') as HTMLCanvasElement;

const party = await showLobby(ui);
const scene = createScene(canvas, party.world);
const hud = createHud(ui, party.code, party.playerId);
const keyboard = createKeyboard();
party.onClose((reason) => hud.banner(`${reason}. Odśwież stronę.`));

// Own bus is predicted locally (instant controls) and nudged toward the server's version.
let ownBus: Bus | null = null;
let acc = 0;
let lastFrame = performance.now();

function frame(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const snap = party.latest();
  const input = keyboard.read();
  party.sendInput(input);

  const me = snap.players.find((p) => p.id === party.playerId);
  const serverBus = snap.buses.find((b) => b.id === me?.busId);
  if (!serverBus) ownBus = null;
  else if (!ownBus || ownBus.id !== serverBus.id) ownBus = { ...serverBus };

  if (ownBus && serverBus) {
    acc += dt;
    while (acc >= SIM_DT) {
      updateBus(ownBus, input, SIM_DT, party.world.size);
      acc -= SIM_DT;
    }
    const err = Math.hypot(serverBus.x - ownBus.x, serverBus.z - ownBus.z);
    const k = err > 4 ? 1 : 1 - Math.exp(-dt * 2);
    ownBus.x += (serverBus.x - ownBus.x) * k;
    ownBus.z += (serverBus.z - ownBus.z) * k;
    ownBus.angle = lerpAngle(ownBus.angle, serverBus.angle, k);
    ownBus.speed += (serverBus.speed - ownBus.speed) * k;
  }

  const buses = party.interpolatedBuses(now).map((b) => (ownBus && b.id === ownBus.id ? ownBus : b));
  scene.render(buses, snap.players, ownBus ?? undefined, dt);
  hud.update(snap.players);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
