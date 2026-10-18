import * as THREE from 'three';
import type { Bus } from '../shared/types';
import { createBusModel, type BusModel } from './models/bus';
import { createStinkEffect } from './stink';

const SKY = 0x9fd3f0;
const RING_R = 6;
const LAP_S = 14;
/** Stage 1: green puffs but no cloud hiding the bus. */
const MENU_STINK = 65;

export interface MenuBackdrop {
  /** Buses circling the island, one per colour; the first one is the player's. */
  setColors(colors: number[]): void;
  dispose(): void;
}

/**
 * Start-screen backdrop: a small voxel island with a ring road and stinking buses
 * driving around it. Own canvas behind #ui, removed on dispose (the game makes its own renderer).
 */
export function createMenuBackdrop(): MenuBackdrop {
  const canvas = document.createElement('canvas');
  canvas.className = 'menu-backdrop';
  document.body.insertBefore(canvas, document.body.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 26, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);

  const owned: { dispose(): void }[] = [];
  const mat = (color: number) => {
    const m = new THREE.MeshLambertMaterial({ color });
    owned.push(m);
    return m;
  };
  const geo = <G extends THREE.BufferGeometry>(g: G) => (owned.push(g), g);

  // Island: grass slab on a dirt base, flat ring road on top.
  const grass = new THREE.Mesh(geo(new THREE.CylinderGeometry(11, 11, 0.6, 12)), mat(0x8cc06a));
  grass.position.y = -0.3;
  const dirt = new THREE.Mesh(geo(new THREE.CylinderGeometry(11, 9, 2.4, 12)), mat(0x8a6a44));
  dirt.position.y = -1.8;
  const road = new THREE.Mesh(geo(new THREE.RingGeometry(RING_R - 1.1, RING_R + 1.1, 48)), mat(0x55585e));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(grass, dirt, road);

  // Voxel blocks of flats in the middle and around the edge.
  const box = geo(new THREE.BoxGeometry(1, 1, 1));
  const wallColors = [0xe8dcc4, 0xd9a07a, 0xb8c4cf, 0xf0e3a0, 0xc7b8d8];
  const blocks: [number, number, number, number][] = [
    [0, 0, 2, 2.6], [-1.6, 1.2, 1.2, 1.6], [1.5, -1.3, 1.4, 2],
    [9, 2, 1.6, 2.4], [-8.5, -4, 1.8, 3], [3, -9, 1.6, 1.8], [-4, 8.6, 1.6, 2.2], [7, -6, 1.4, 1.4],
  ];
  blocks.forEach(([x, z, w, h], i) => {
    const b = new THREE.Mesh(box, mat(wallColors[i % wallColors.length]));
    b.scale.set(w, h, w);
    b.position.set(x, h / 2, z);
    const roof = new THREE.Mesh(box, mat(0x6b5b4e));
    roof.scale.set(w + 0.2, 0.2, w + 0.2);
    roof.position.set(x, h + 0.1, z);
    scene.add(b, roof);
  });
  // Round voxel trees.
  const trunk = mat(0x7a5634);
  const leaves = mat(0x4f9a3c);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = i % 2 ? 9.6 : 3.6;
    const t = new THREE.Mesh(box, trunk);
    t.scale.set(0.3, 0.6, 0.3);
    t.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
    const l = new THREE.Mesh(box, leaves);
    l.scale.set(0.9, 0.9, 0.9);
    l.position.set(t.position.x, 1, t.position.z);
    scene.add(t, l);
  }

  const stink = createStinkEffect(scene);
  let models: BusModel[] = [];
  const buses: Bus[] = [];

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  let time = 0;
  let last = performance.now();
  let raf = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += reduced ? 0 : dt;

    models.forEach((m, i) => {
      const theta = (time / LAP_S) * Math.PI * 2 + (i / models.length) * Math.PI * 2;
      const b = buses[i];
      b.x = Math.cos(theta) * RING_R;
      b.z = Math.sin(theta) * RING_R;
      b.angle = -theta;
      m.group.position.set(b.x, 0, b.z);
      m.group.rotation.y = b.angle;
    });
    stink.update(buses, reduced ? 0 : dt);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    // Slow orbit; on wide screens the island sits right of the menu card.
    const orbit = time * 0.05 + 0.8;
    const dist = camera.aspect < 1 ? 28 : 19;
    const shift = camera.aspect > 1.2 ? -5 : 0;
    camera.position.set(Math.cos(orbit) * dist, 11, Math.sin(orbit) * dist);
    camera.lookAt(0, 0.5, 0);
    camera.translateX(shift);
    // Portrait: the card covers the top, so drop the island to the bottom of the screen.
    if (camera.aspect < 0.8) camera.translateY(9);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setColors(colors) {
      models.forEach((m) => {
        scene.remove(m.group);
        m.dispose();
      });
      models = colors.map((c) => {
        const m = createBusModel(c);
        m.setStink(MENU_STINK);
        scene.add(m.group);
        return m;
      });
      buses.length = 0;
      colors.forEach((_, id) => buses.push({ id, x: 0, z: 0, angle: 0, speed: 0, driverId: null, stink: MENU_STINK }));
    },
    dispose() {
      cancelAnimationFrame(raf);
      models.forEach((m) => m.dispose());
      owned.forEach((o) => o.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
