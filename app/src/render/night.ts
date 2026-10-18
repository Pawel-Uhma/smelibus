import * as THREE from 'three';
import {
  DAY_NIGHT_CYCLE, DAY_NIGHT_CYCLE_S, EXTRA_BUSES, MAX_PLAYERS, NIGHT_AMBIENT, NIGHT_HEADLIGHT_ANGLE,
  NIGHT_HEADLIGHT_INTENSITY, NIGHT_HEADLIGHT_RANGE, NIGHT_MOON, NIGHT_SHARE, NIGHT_TAILLIGHT_GLOW,
  NIGHT_ZABKA_INTENSITY, NIGHT_ZABKA_LIGHTS_MAX, NIGHT_ZABKA_RANGE, TWILIGHT_S, ZABKA_TILES,
} from '../shared/config';
import type { Bus, World } from '../shared/types';
import { zabkaFront } from '../sim/zabka';
import { BUS_VOXEL_SIZE as V } from './models/bus';

const SKY = 0x0b1026;
const DUSK = 0xe98a5f;
const MOON = 0x9fb4ff;
const HEMI_SKY = 0x6f80b8;
const HEMI_GROUND = 0x1c2030;
const HEADLIGHT = 0xfff1c8;
const TAILLIGHT = 0xff2a1a;
const ZABKA_LIGHT = 0xc8ffb8;
const ZABKA_GLOW = 0x5cff6a;
const HEAD_OPACITY = 0.95;
const TAIL_OPACITY = 0.9;
const ZABKA_SPILL_OPACITY = 0.35;
const ZABKA_SIGN_OPACITY = 0.5;

// Lamp spots on the bus model (render/models/bus.ts: bus faces +z, headlight voxels at the
// front corners, voxel row z = 2). Half a voxel out of the face so the glow isn't inside the body.
const LAMP_X = 2 * V;
const LAMP_Y = 2.5 * V;
const FRONT_Z = 9 * V + 0.05;
const BACK_Z = -FRONT_Z;

export type NightMode = 'cycle' | 'night' | 'day';

/** `?noc` (or `?night`) forces night, `?noc=0` forces day; otherwise the cycle (if DAY_NIGHT_CYCLE). */
export function nightModeFromUrl(search: string): NightMode {
  const q = new URLSearchParams(search);
  const v = q.get('noc') ?? q.get('night');
  if (v === null) return DAY_NIGHT_CYCLE ? 'cycle' : 'day';
  return v === '0' || v === 'false' ? 'day' : 'night';
}

const smooth = (k: number) => k * k * (3 - 2 * k);

/**
 * Darkness 0 (day) .. 1 (night) at game time `time`. Each cycle: day, dusk, night, dawn;
 * the match starts in the morning, and dawn ends exactly where the next day begins.
 */
export function nightLevel(time: number): number {
  const t = ((time % DAY_NIGHT_CYCLE_S) + DAY_NIGHT_CYCLE_S) % DAY_NIGHT_CYCLE_S;
  const duskStart = DAY_NIGHT_CYCLE_S * (1 - NIGHT_SHARE);
  const duskEnd = duskStart + TWILIGHT_S;
  const dawnStart = DAY_NIGHT_CYCLE_S - TWILIGHT_S;
  if (t < duskStart) return 0;
  if (t < duskEnd) return smooth((t - duskStart) / TWILIGHT_S);
  if (t < dawnStart) return 1;
  return smooth(1 - (t - dawnStart) / TWILIGHT_S);
}

/** Soft round blob, white in the middle, transparent at the edge; tinted by material colour. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface BusLights {
  group: THREE.Group;
  beam: THREE.SpotLight;
}

/**
 * Day/night look. Only reads game state: dims the scene's own lights, gives buses headlight beams and
 * a red glow behind, and Żabkas a shop light, all scaled by the darkness level.
 * Unlit (MeshBasic) layers like zones and roads wear a lit copy: by day it glows with exactly the
 * unlit colour (emissive), by night it is lit like the rest, so headlights show on zones and roads.
 */
export function createNight(scene: THREE.Scene, world: World) {
  const tex = glowTexture();
  const additive = (color: number) => ({
    map: tex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const headMat = new THREE.SpriteMaterial(additive(HEADLIGHT));
  const tailMat = new THREE.SpriteMaterial(additive(TAILLIGHT));
  const tailGroundMat = new THREE.MeshBasicMaterial(additive(TAILLIGHT));
  const zabkaGroundMat = new THREE.MeshBasicMaterial(additive(ZABKA_GLOW));
  const signMat = new THREE.SpriteMaterial(additive(ZABKA_GLOW));
  const groundGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  const root = new THREE.Group();
  scene.add(root);

  // Fixed light pool, kept in the scene by day too (at zero): a changing light count recompiles
  // every shader, which would stutter at each dusk.
  const pool: BusLights[] = [];
  for (let i = 0; i < MAX_PLAYERS + EXTRA_BUSES; i++) {
    const group = new THREE.Group();
    // Beam from above the bonnet, so it hits the ground at a steep enough angle to read from the top camera.
    const beam = new THREE.SpotLight(HEADLIGHT, 0, NIGHT_HEADLIGHT_RANGE, NIGHT_HEADLIGHT_ANGLE, 0.7, 1);
    beam.position.set(0, 2.5, 0.8);
    beam.target.position.set(0, 0, 7);
    group.add(beam, beam.target);
    for (const side of [-1, 1]) {
      const head = new THREE.Sprite(headMat);
      head.scale.setScalar(0.55);
      head.position.set(side * LAMP_X, LAMP_Y, FRONT_Z);
      const tail = new THREE.Sprite(tailMat);
      tail.scale.setScalar(0.45);
      tail.position.set(side * LAMP_X, LAMP_Y, BACK_Z);
      group.add(head, tail);
    }
    const tailGround = new THREE.Mesh(groundGeo, tailGroundMat);
    tailGround.scale.set(2.4, 1, 2);
    tailGround.position.set(0, 0.03, BACK_Z - 0.7);
    tailGround.renderOrder = 4;
    tailGround.userData.nightUnlit = true;
    group.add(tailGround);
    root.add(group);
    pool.push({ group, beam });
  }

  // Żabka: light spilling out of the shop front onto the pavement, and a green halo round the sign.
  const zabkaLamps: THREE.PointLight[] = [];
  (world.zabkas ?? []).forEach((shop, i) => {
    const f = zabkaFront(world, shop);
    const half = ZABKA_TILES / 2;
    const group = new THREE.Group();
    group.position.set(shop.x, 0, shop.z);
    group.rotation.y = Math.atan2(f.x, f.z);
    const spill = new THREE.Mesh(groundGeo, zabkaGroundMat);
    spill.scale.set(ZABKA_TILES + 1.5, 1, 2.5);
    spill.position.set(0, 0.03, half + 1);
    spill.renderOrder = 4;
    spill.userData.nightUnlit = true;
    const sign = new THREE.Sprite(signMat);
    sign.scale.set(ZABKA_TILES + 1, 1.2, 1);
    sign.position.set(0, 1.65, half + 0.1);
    group.add(spill, sign);
    if (i < NIGHT_ZABKA_LIGHTS_MAX) {
      const lamp = new THREE.PointLight(ZABKA_LIGHT, 0, NIGHT_ZABKA_RANGE, 1);
      lamp.position.set(0, 1.2, half + 0.6);
      group.add(lamp);
      zabkaLamps.push(lamp);
    }
    root.add(group);
  });

  // Day values of the scene's own lights and sky, blended toward night.
  const lights: { light: THREE.Light; intensity: number; color: THREE.Color; ground?: THREE.Color }[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.HemisphereLight) lights.push({ light: o, intensity: o.intensity, color: o.color.clone(), ground: o.groundColor.clone() });
    else if (o instanceof THREE.DirectionalLight) lights.push({ light: o, intensity: o.intensity, color: o.color.clone() });
  });
  const daySky = scene.background instanceof THREE.Color ? scene.background.clone() : new THREE.Color(0x9fd3f0);
  const sky = new THREE.Color();
  const hemiSky = new THREE.Color(HEMI_SKY);
  const hemiGround = new THREE.Color(HEMI_GROUND);
  const moon = new THREE.Color(MOON);
  const dusk = new THREE.Color(DUSK);
  const night = new THREE.Color(SKY);

  /** Mesh → its own unlit material, while it wears a lit copy. */
  const swapped = new Map<THREE.Mesh, { day: THREE.MeshBasicMaterial; lit: THREE.MeshLambertMaterial }>();

  /** New unlit meshes appear any time (zones rebuild, weather cells), so this runs every frame. */
  function swapUnlit(k: number) {
    scene.traverse((o) => {
      if (o.userData.nightUnlit || !(o instanceof THREE.Mesh) || swapped.has(o)) return;
      if (!(o.material instanceof THREE.MeshBasicMaterial)) return;
      const day = o.material;
      const lit = new THREE.MeshLambertMaterial({
        transparent: day.transparent, depthWrite: day.depthWrite, depthTest: day.depthTest,
        side: day.side, alphaTest: day.alphaTest,
      });
      o.material = lit;
      swapped.set(o, { day, lit });
    });
    // Other modules keep changing their own material (weather fades opacity), so mirror it.
    for (const [mesh, { day, lit }] of swapped) {
      if (!mesh.parent) {
        lit.dispose();
        swapped.delete(mesh);
        continue;
      }
      lit.opacity = day.opacity;
      lit.color.copy(day.color).multiplyScalar(k);
      lit.emissive.copy(day.color).multiplyScalar(1 - k);
      if (lit.map !== day.map) {
        lit.map = day.map;
        lit.emissiveMap = day.map;
        lit.needsUpdate = true;
      }
    }
  }

  function restoreUnlit() {
    for (const [mesh, { day, lit }] of swapped) {
      if (mesh.material === lit) mesh.material = day;
      lit.dispose();
    }
    swapped.clear();
  }

  function apply(k: number) {
    for (const l of lights) {
      const hemi = l.light instanceof THREE.HemisphereLight;
      l.light.intensity = THREE.MathUtils.lerp(l.intensity, hemi ? NIGHT_AMBIENT : NIGHT_MOON, k);
      l.light.color.lerpColors(l.color, hemi ? hemiSky : moon, k);
      if (l.light instanceof THREE.HemisphereLight) l.light.groundColor.lerpColors(l.ground!, hemiGround, k);
    }
    // Through a warm dusk colour on the way, not straight from blue to navy.
    if (k < 0.5) sky.lerpColors(daySky, dusk, k * 2);
    else sky.lerpColors(dusk, night, (k - 0.5) * 2);
    scene.background = sky;
    headMat.opacity = HEAD_OPACITY * k;
    tailMat.opacity = TAIL_OPACITY * k;
    tailGroundMat.opacity = NIGHT_TAILLIGHT_GLOW * k;
    zabkaGroundMat.opacity = ZABKA_SPILL_OPACITY * k;
    signMat.opacity = ZABKA_SIGN_OPACITY * k;
    for (const l of pool) l.beam.intensity = NIGHT_HEADLIGHT_INTENSITY * k;
    for (const lamp of zabkaLamps) lamp.intensity = NIGHT_ZABKA_INTENSITY * k;
  }

  let mode: NightMode = 'cycle';

  return {
    get mode() {
      return mode;
    },
    set(next: NightMode) {
      mode = next;
    },
    /** Key N: force night, and back to the normal cycle (or day, if the cycle is off). */
    toggle() {
      mode = mode === 'night' ? (DAY_NIGHT_CYCLE ? 'cycle' : 'day') : 'night';
    },
    /** Call every frame with the buses as drawn and the game time. */
    update(buses: readonly Bus[], time: number) {
      // Forced day never touches the scene, so it looks exactly like before the cycle existed.
      root.visible = mode !== 'day';
      if (mode === 'day') {
        if (swapped.size) {
          restoreUnlit();
          apply(0);
        }
        return;
      }
      const k = mode === 'night' ? 1 : nightLevel(time);
      swapUnlit(k);
      apply(k);
      pool.forEach((l, i) => {
        const bus = buses[i];
        // Spare lights stay in the scene, just dark, so the light count never changes.
        if (!bus) l.beam.intensity = 0;
        for (const c of l.group.children) if (c !== l.beam && c !== l.beam.target) c.visible = !!bus;
        if (!bus) return;
        l.group.position.set(bus.x, 0, bus.z);
        l.group.rotation.y = bus.angle;
      });
    },
  };
}
