import './style.css';
import { createSounds } from './audio/sounds';
import { createKeyboard } from './input/keyboard';
import { createTouch, mergeInputs } from './input/touch';
import { createBonusesRender } from './render/bonuses';
import { createCameraMode } from './render/camera';
import { createContrast } from './render/contrast';
import { createNight, nightModeFromUrl } from './render/night';
import { createZulRender } from './render/zul';
import { createScene } from './render/scene';
import { createWeatherRender } from './render/weather';
import { HIGH_CONTRAST_NIGHT_MAX } from './shared/config';
import { createZonesRender } from './render/zones';
import type { Snapshot } from './shared/types';
import { createBusPredictor, type BusPredictor } from './sim/prediction';
import { createHud } from './ui/hud';
import { createMinimap } from './ui/minimap';
import { showLobby } from './ui/lobby/lobby';

const ui = document.getElementById('ui')!;
const contrast = createContrast();
const cameraMode = createCameraMode();
const canvas = document.getElementById('game') as HTMLCanvasElement;

const party = await showLobby(ui);
const scene = createScene(canvas, party.world);
const zones = createZonesRender(scene.scene);
const bonuses = createBonusesRender(scene.scene);
const zuls = createZulRender(scene.scene);
const weather = createWeatherRender(scene.scene);
const night = createNight(scene.scene, party.world);
night.set(nightModeFromUrl(location.search));
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyN') night.toggle();
  if (e.code === 'KeyK') contrast.toggle();
});
const hud = createHud(ui, party.code, party.playerId, {
  isHost: () => party.lobby().hostId === party.playerId,
  request: () => party.rematch(),
}, () => party.leave());
const minimap = createMinimap(ui, party.playerId);
const keyboard = createKeyboard();
const touch = createTouch();
const sounds = createSounds(party.world, party.playerId);
ui.querySelector('.hud .party')?.append(cameraMode.button(), sounds.muteButton(), contrast.button());
let lastHorn = 0;
party.onClose((reason) => hud.banner(`${reason}. Odśwież stronę.`));
// Rematch (card 027): the scene is built for one map, so reload and rejoin the same seat
// (reconnect token); the server sends the new map's `welcome` and the waiting room shows again.
// The frame loop stops first, so render, sounds and prediction never see the new map's
// `welcome` (sounds would diff the old tiles against it and play a bogus capture).
let rematching = false;
party.onRematch(() => {
  rematching = true;
  location.reload();
});

// Own bus is predicted locally (instant controls) and replayed on top of each server snapshot.
let predictor: BusPredictor | null = null;
let reconciled: Snapshot | null = null;
let lastFrame = performance.now();

function frame(now: number) {
  if (rematching) return;
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const snap = party.latest();
  const me = snap.players.find((p) => p.id === party.playerId);
  // Behind or in the bus the stick drives it like a wheel and pedals; from the top it aims on screen.
  const input = mergeInputs(keyboard.read(), touch.read(predictor?.bus, cameraMode.mode !== 'top'));
  if ((input.horn ?? 0) > lastHorn) sounds.honk();
  lastHorn = input.horn ?? 0;
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
    predictor.bus.zulsUntil = serverBus.zulsUntil;
    predictor.bus.collected = serverBus.collected;
    predictor.bus.driverId = serverBus.driverId;
  }
  party.sendInput(predictor ? { ...input, seq: predictor.seq } : input);
  const ownBus = predictor?.bus ?? null;

  const buses = shown.map((b) => (ownBus && b.id === ownBus.id ? ownBus : b));
  zones.update(party.world, snap.players, dt, contrast.on);
  bonuses.update(snap.bonuses ?? [], dt);
  zuls.update(snap.bonuses ?? [], snap.time, dt);
  weather.update(snap.weather ?? [], snap.time, dt);
  night.setMaxDarkness(contrast.on ? HIGH_CONTRAST_NIGHT_MAX : 1);
  night.update(buses, snap.time);
  // On foot the camera follows the pedestrian (card 006).
  const onFoot = me && me.busId === null && me.x !== undefined && me.z !== undefined ? { x: me.x, z: me.z } : undefined;
  scene.render(buses, snap.players, ownBus ?? onFoot, dt, snap.time, { mode: cameraMode.mode, bus: ownBus, steer: input.steer });
  // Stink pops rise from just above the own bus.
  const ownScreen = ownBus ? scene.toScreen(ownBus.x, 2.6, ownBus.z) : null;
  sounds.update(snap, ownBus ?? onFoot, dt);
  hud.update({ time: snap.time, players: snap.players, buses, tiles: party.world.tiles, winnerId: snap.winnerId, ownScreen });
  minimap.update({ world: party.world, players: snap.players, buses, weather: snap.weather ?? [], toScreen: scene.toScreen });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
