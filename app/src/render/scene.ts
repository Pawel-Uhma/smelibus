import * as THREE from 'three';
import type { Bus, Player, PlayerId, World } from '../shared/types';
import { createBusModel, type BusModel } from './models/bus';
import { createStinkEffect } from './stink';

/** Placeholder render: flat ground, buses as plain boxes. Cards 003/004 replace it with voxels. */
export function createScene(canvas: HTMLCanvasElement, world: World) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd3f0);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  const s = world.size;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(s, s),
    new THREE.MeshLambertMaterial({ color: 0x8cc06a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(s / 2, 0, s / 2);
  scene.add(ground);
  const grid = new THREE.GridHelper(s, s, 0x6f9e52, 0x7cb05c);
  grid.position.set(s / 2, 0.01, s / 2);
  scene.add(grid);

  const meshes = new Map<number, BusModel>();
  const stink = createStinkEffect(scene);

  function syncBus(bus: Bus, color: number) {
    let m = meshes.get(bus.id);
    if (!m) {
      m = createBusModel(color);
      scene.add(m.group);
      meshes.set(bus.id, m);
    }
    m.setColor(color);
    m.setStink(bus.stink);
    m.group.position.set(bus.x, 0, bus.z);
    m.group.rotation.y = bus.angle;
  }

  const camTarget = new THREE.Vector3(s / 2, 0, s / 2);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  return {
    /** Lets other render modules (render/zones.ts) add their own meshes. */
    scene,
    render(buses: Bus[], players: Player[], follow: Bus | undefined, dt: number) {
      resize();
      const colorOf = new Map<PlayerId, number>(players.map((p) => [p.id, p.color]));
      for (const bus of buses) syncBus(bus, (bus.driverId && colorOf.get(bus.driverId)) || 0xbbbbbb);
      stink.update(buses, dt);
      if (follow) {
        const k = 1 - Math.exp(-dt * 6);
        camTarget.lerp(new THREE.Vector3(follow.x, 0, follow.z), k);
      }
      // Top-down view, slightly tilted so boxes read as 3D.
      camera.position.set(camTarget.x, 34, camTarget.z - 14);
      camera.lookAt(camTarget);
      renderer.render(scene, camera);
    },
  };
}
