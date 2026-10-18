import './style.css';
import { createKeyboard } from './input/keyboard';
import { createTouch, mergeInputs } from './input/touch';
import { createBonusesRender } from './render/bonuses';
import { createZulRender } from './render/zul';
import { createScene } from './render/scene';
import { createWeatherRender } from './render/weather';
import { createZonesRender } from './render/zones';
import type { Snapshot } from './shared/types';
import { createBusPredictor, type BusPredictor } from './sim/prediction';
import { createHud } from './ui/hud';
import { showLobby } from './ui/lobby/lobby';

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('game') as HTMLCanvasElement;

const party = await showLobby(ui);
const scene = createScene(canvas, party.world);
const zones = createZonesRender(scene.scene);
const bonuses = createBonusesRender(scene.scene);
const zuls = createZulRender(scene.scene);
const weather = createWeatherRender(scene.scene);
const hud = createHud(ui, party.code, party.playerId);
const keyboard = createKeyboard();
const touch = createTouch();
party.onClose((reason) => hud.banner(`${reason}. Odśwież stronę.`));

// Own bus is predicted locally (instant controls) and replayed on top of each server snapshot.
let predictor: BusPredictor | null = null;
let reconciled: Snapshot | null = null;
let lastFrame = performance.now();

function frame(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const snap = party.latest();
  const me = snap.players.find((p) => p.id === party.playerId);
  const input = mergeInputs(keyboard.read(me?.busId === null), touch.read());
  const serverBus = snap.buses.find((b) => b.id === me?.busId);
  if (!serverBus) predictor = null;
  else if (!predictor || predictor.bus.id !== serverBus.id) predictor = createBusPredictor(serverBus, party.world.size, party.world);
  const shown = party.interpolatedBuses(now);
  if (predictor && serverBus) {
    // Collide with the other buses where they are drawn, so ours never visibly drives into them.
    // A server without acks (older deploy) can't be replayed on; the prediction then runs on its own.
    if (snap !== reconciled && snap.acks) predictor.reconcile(serverBus, snap.acks[party.playerId], shown);
    reconciled = snap;
    predictor.step(input, dt, shown);
    // Only movement is predicted; stink and the rest come straight from the server.
    predictor.bus.stink = serverBus.stink;
    predictor.bus.slowDecayUntil = serverBus.slowDecayUntil;
    predictor.bus.driverId = serverBus.driverId;
  }
  party.sendInput(predictor ? { ...input, seq: predictor.seq } : input);
  const ownBus = predictor?.bus ?? null;

  const buses = shown.map((b) => (ownBus && b.id === ownBus.id ? ownBus : b));
  zones.update(party.world, snap.players, dt);
  bonuses.update(snap.bonuses ?? [], dt);
  zuls.update(snap.bonuses ?? [], snap.time, dt);
  weather.update(snap.weather ?? [], snap.time, dt);
  // On foot the camera follows the pedestrian (card 006).
  const onFoot = me && me.busId === null && me.x !== undefined && me.z !== undefined ? { x: me.x, z: me.z } : undefined;
  scene.render(buses, snap.players, ownBus ?? onFoot, dt, snap.time);
  hud.update({ time: snap.time, players: snap.players, buses, tiles: party.world.tiles, winnerId: snap.winnerId });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
