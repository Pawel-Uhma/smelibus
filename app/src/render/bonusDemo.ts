// Standalone bonus model viewer: `npm run dev`, then open /demo-bonuses.html. Not part of the game.
import '../style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BONUS_STINK, PLAYER_COLORS } from '../shared/config';
import type { Bonus, BonusKind } from '../shared/types';
import { createBonusesRender } from './bonuses';
import { createBusModel } from './models/bus';

const KINDS: BonusKind[] = ['zul', 'kebab', 'dog', 'fan', 'herring', 'durian', 'trash', 'controller', 'dropped'];

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3f0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(30, 60, 20);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x8cc06a }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// One of each kind in a row, a bus behind them for scale.
const bonuses: Bonus[] = KINDS.map((kind, i) => ({
  id: i, spot: 'map', kind, x: (i - (KINDS.length - 1) / 2) * 1.3, z: 0,
  amount: kind === 'dropped' ? 10 : BONUS_STINK[kind], active: true, respawnAt: 0,
}) as Bonus);
const render = createBonusesRender(scene);
const bus = createBusModel(PLAYER_COLORS[0]);
bus.group.position.set(0, 0, -2.5);
bus.group.rotation.y = Math.PI / 2;
scene.add(bus.group);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
// `?game` starts from the in-game angle (render/scene.ts): from above, slightly tilted.
const gameView = new URLSearchParams(location.search).has('game');
if (gameView) camera.position.set(0, 34, -14);
else camera.position.set(0, 4, 8);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, gameView ? 0 : 0.5, 0);
controls.enableDamping = true;

let lastFrame = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  render.update(bonuses, dt);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
