import './style.css';
import { createKeyboard } from './input/keyboard';
import { createScene } from './render/scene';
import { createZonesRender } from './render/zones';
import { createBusPredictor, type BusPredictor } from './sim/prediction';
import { createHud } from './ui/hud';
import { showLobby } from './ui/lobby/lobby';

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('game') as HTMLCanvasElement;

const party = await showLobby(ui);
const scene = createScene(canvas, party.world);
const zones = createZonesRender(scene.scene);
const hud = createHud(ui, party.code, party.playerId);
const keyboard = createKeyboard();
party.onClose((reason) => hud.banner(`${reason}. Odśwież stronę.`));

// Own bus is predicted locally (instant controls) and eased toward the server's version.
let predictor: BusPredictor | null = null;
let lastFrame = performance.now();

function frame(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const snap = party.latest();
  const input = keyboard.read();
  party.sendInput(input);

  const me = snap.players.find((p) => p.id === party.playerId);
  const serverBus = snap.buses.find((b) => b.id === me?.busId);
  if (!serverBus) predictor = null;
  else if (!predictor || predictor.bus.id !== serverBus.id) predictor = createBusPredictor(serverBus, party.world.size);
  if (predictor && serverBus) {
    predictor.step(input, dt);
    predictor.reconcile(serverBus, dt);
  }
  const ownBus = predictor?.bus ?? null;

  const buses = party.interpolatedBuses(now).map((b) => (ownBus && b.id === ownBus.id ? ownBus : b));
  zones.update(party.world, snap.players, dt);
  scene.render(buses, snap.players, ownBus ?? undefined, dt);
  hud.update({ time: snap.time, players: snap.players, buses, tiles: party.world.tiles, winnerId: snap.winnerId });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
