import * as THREE from 'three';
import type { Bus, Player, PlayerId, World } from '../shared/types';
import { showAttribution } from '../ui/attribution';
import { createCityRender } from './city';
import { createBusModel, type BusModel } from './models/bus';
import { createPedestrianModel, type PedestrianModel } from './models/pedestrian';
import { jumpHeight } from '../sim/player';
import { garbleName } from './garbleName';
import { createNameplate, stackNameplates, type Nameplate } from './nameplate';
import { createStinkEffect } from './stink';
import { createPaczkomatRender } from './paczkomat';
import { createZabkaRender } from './zabka';
import { CAMERA_FOV, cameraPose, createCockpit, isFirstPerson, type CameraMode } from './camera';

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
  if (world.tiles.some((t) => t.kind)) createCityRender(scene, world);
  if (world.attribution) showAttribution(world.attribution);
  createZabkaRender(scene, world);
  createPaczkomatRender(scene, world);

  const meshes = new Map<number, BusModel>();
  // Driver nick above each bus; separate from the bus group so it does not spin with it.
  const plates = new Map<number, Nameplate>();
  const stink = createStinkEffect(scene);

  // Pedestrians: snapshots come 20×/s, so the drawn position eases toward the latest one.
  const walkers = new Map<PlayerId, { model: PedestrianModel; pivot: THREE.Group }>();
  function syncPedestrians(players: Player[], time: number, dt: number) {
    const k = 1 - Math.exp(-dt * 15);
    const onFoot = new Set<PlayerId>();
    for (const p of players) {
      if (p.busId !== null || p.x === undefined || p.z === undefined) continue;
      onFoot.add(p.id);
      let w = walkers.get(p.id);
      if (!w) {
        const model = createPedestrianModel(p.color);
        const pivot = new THREE.Group();
        pivot.add(model.group);
        pivot.position.set(p.x, 0, p.z);
        scene.add(pivot);
        w = { model, pivot };
        walkers.set(p.id, w);
      }
      w.model.setColor(p.color);
      w.pivot.position.x += (p.x - w.pivot.position.x) * k;
      w.pivot.position.z += (p.z - w.pivot.position.z) * k;
      w.pivot.rotation.y = p.angle ?? 0;
      // Knocked down: lying on the back, face up.
      const stunned = (p.stunnedUntil ?? 0) > time;
      w.model.group.rotation.x = stunned ? -Math.PI / 2 : 0;
      w.model.group.position.y = stunned ? 0.2 : jumpHeight(p, time);
    }
    for (const [id, w] of walkers) {
      if (onFoot.has(id)) continue;
      scene.remove(w.pivot);
      w.model.dispose();
      walkers.delete(id);
    }
  }

  function syncBus(bus: Bus, color: number, driver: Player | undefined) {
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

    let plate = plates.get(bus.id);
    if (!plate) {
      plate = createNameplate();
      scene.add(plate.sprite);
      plates.set(bus.id, plate);
    }
    // Only over the bus the player is really in, so a stale interpolated bus never shows a second copy.
    const named = driver?.busId === bus.id ? driver : undefined;
    plate.sprite.visible = !!named;
    if (named) {
      plate.set(garbleName(named.name, bus.stink), named.color);
      plate.anchor.set(bus.x, 2.3, bus.z);
    }
  }

  const camTarget = new THREE.Vector3(s / 2, 0, s / 2);
  let camAngle = 0;
  const cockpit = createCockpit();
  scene.add(cockpit.group);

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
    /**
     * `view` picks the camera (render/camera.ts); the close views follow `view.bus`, the own bus.
     * Without it, or on foot, the camera is the top-down one following `follow`.
     */
    render(
      buses: Bus[], players: Player[], follow: { x: number; z: number } | undefined, dt: number, time = 0,
      view?: { mode: CameraMode; bus: Bus | null; steer: number },
    ) {
      resize();
      const byId = new Map<PlayerId, Player>(players.map((p) => [p.id, p]));
      for (const bus of buses) {
        const driver = bus.driverId ? byId.get(bus.driverId) : undefined;
        syncBus(bus, driver?.color || 0xbbbbbb, driver);
      }
      syncPedestrians(players, time, dt);
      stink.update(buses, dt);
      const own = view?.bus ?? null;
      const mode: CameraMode = own ? view!.mode : 'top';
      const inside = isFirstPerson(mode);
      if (own && inside) {
        // In the driver's seat the view is glued to the bus, any lag would feel like a loose neck.
        camTarget.set(own.x, 0, own.z);
        camAngle = own.angle;
      } else if (follow) {
        const k = 1 - Math.exp(-dt * 6);
        camTarget.lerp(new THREE.Vector3(follow.x, 0, follow.z), k);
        if (own) {
          // The drone swings behind the bus a bit slower than it moves, so turns read on screen.
          const d = Math.atan2(Math.sin(own.angle - camAngle), Math.cos(own.angle - camAngle));
          camAngle += d * (1 - Math.exp(-dt * 4));
        }
      }
      const pose = cameraPose(mode, camTarget.x, camTarget.z, camAngle);
      camera.position.set(pose.pos.x, pose.pos.y, pose.pos.z);
      camera.lookAt(pose.look.x, pose.look.y, pose.look.z);
      const near = inside ? 0.03 : 0.1;
      if (camera.fov !== CAMERA_FOV[mode] || camera.near !== near) {
        camera.fov = CAMERA_FOV[mode];
        camera.near = near;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
      // From the seat the own bus model would block the view: the cockpit (or nothing) replaces it.
      for (const [id, m] of meshes) m.group.visible = !(inside && own?.id === id);
      // Behind the bus the own nick would cover the road ahead, and it's clear whose bus it is.
      for (const [id, p] of plates) if (mode !== 'top' && own?.id === id) p.sprite.visible = false;
      cockpit.group.visible = mode === 'cockpit';
      if (own && mode === 'cockpit') {
        cockpit.group.position.set(own.x, 0, own.z);
        cockpit.group.rotation.y = own.angle;
        const driver = own.driverId ? byId.get(own.driverId) : undefined;
        cockpit.update(driver?.color || 0xbbbbbb, view!.steer, dt);
      }
      const shownPlates = [...plates.entries()].filter(([, p]) => p.sprite.visible).sort((a, b) => a[0] - b[0]);
      stackNameplates(shownPlates.map(([, p]) => p), camera, dt);
      renderer.render(scene, camera);
    },
    /** Screen position (CSS px) of a world point as of the last render, null when behind the camera. */
    toScreen(x: number, y: number, z: number): { x: number; y: number } | null {
      const v = new THREE.Vector3(x, y, z).project(camera);
      if (v.z > 1) return null;
      return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight };
    },
  };
}
