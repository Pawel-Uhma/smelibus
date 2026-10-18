// Standalone model viewer: `npm run dev`, then open /demo-bus.html. Not part of the game.
import '../../style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLAYER_COLORS, STINK_MAX } from '../../shared/config';
import { createBusModel, stinkStage } from './bus';

const STAGE_NAMES = ['Świeżak', 'Zalatuje', 'Durian'];

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui')!;
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
const grid = new THREE.GridHelper(40, 40, 0x6f9e52, 0x7cb05c);
grid.position.y = 0.01;
scene.add(grid);

// One bus per player colour, two rows of four, all facing +z like bus.angle = 0.
const buses = PLAYER_COLORS.map((color, i) => {
  const bus = createBusModel(color);
  bus.group.position.set((i % 4) * 2.4 - 3.6, 0, i < 4 ? 2.5 : -2.5);
  scene.add(bus.group);
  return bus;
});

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotateSpeed = 1.5;

function freeView() {
  camera.position.set(9, 7, 11);
  controls.target.set(0, 0.5, 0);
}
// Same angle as render/scene.ts: from above, slightly tilted.
function gameView() {
  camera.position.set(0, 34, -14);
  controls.target.set(0, 0, 0);
}
freeView();

const panel = document.createElement('div');
panel.className = 'hud';
panel.innerHTML = `
  <strong>Niskopodłogowiec — demo modelu</strong>
  <label style="display:flex;gap:8px;align-items:center;margin:8px 0">
    Smród <input id="stink" type="range" min="0" max="${STINK_MAX}" value="0" style="padding:0">
    <span id="stinkVal"></span>
  </label>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <button id="camFree">Kamera wolna</button>
    <button id="camGame">Kamera z gry</button>
    <button id="camSpin">Obrót</button>
  </div>
  <p class="help">Mysz: obrót / przybliżenie / przesunięcie.</p>`;
ui.append(panel);

const stinkInput = panel.querySelector<HTMLInputElement>('#stink')!;
const stinkVal = panel.querySelector<HTMLSpanElement>('#stinkVal')!;
function applyStink() {
  const stink = Number(stinkInput.value);
  for (const bus of buses) bus.setStink(stink);
  stinkVal.textContent = `${stink} · ${STAGE_NAMES[stinkStage(stink)]}`;
}
stinkInput.addEventListener('input', applyStink);
applyStink();
panel.querySelector('#camFree')!.addEventListener('click', freeView);
panel.querySelector('#camGame')!.addEventListener('click', gameView);
panel.querySelector('#camSpin')!.addEventListener('click', () => (controls.autoRotate = !controls.autoRotate));

function frame() {
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
