import * as THREE from 'three';

/**
 * Camera views, switched with C or the HUD button. On foot the same view stays on: a drone
 * behind the walker, or his own eyes for both seat views (walking then turns with A/D).
 */
export type CameraMode = 'top' | 'chase' | 'cockpit' | 'eyes';
export const CAMERA_MODES: CameraMode[] = ['top', 'chase', 'cockpit', 'eyes'];
export const CAMERA_LABELS: Record<CameraMode, string> = {
  top: 'Z góry',
  chase: 'Dron za autobusem',
  cockpit: 'Kokpit kierowcy',
  eyes: 'Oczy kierowcy',
};
const CAMERA_ICONS: Record<CameraMode, string> = { top: '🗺', chase: '🚁', cockpit: '🎮', eyes: '👀' };

export const nextCameraMode = (m: CameraMode): CameraMode =>
  CAMERA_MODES[(CAMERA_MODES.indexOf(m) + 1) % CAMERA_MODES.length];

/** True for the views that sit in the driver's seat: the own bus model is hidden there. */
export const isFirstPerson = (m: CameraMode) => m === 'cockpit' || m === 'eyes';

/** Starting value: `?kamera=` in the URL, else what the player picked before, else top-down. */
export function initialCameraMode(search: string, stored: string | null): CameraMode {
  const v = new URLSearchParams(search).get('kamera') ?? stored;
  return CAMERA_MODES.includes(v as CameraMode) ? (v as CameraMode) : 'top';
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Driver's eye in bus space (bus faces +z, its left side is +x; see render/models/bus.ts).
const EYE = { x: 0.2, y: 0.98, z: 0.95 };
/** Eye height of a pedestrian (the model is about 1.3 tiles tall). */
const FOOT_EYE_Y = 1.15;
/** On foot in the close views, A/D turn the walker this fast, radians per second. */
export const FOOT_TURN_RATE = 2.6;

/**
 * Close views on foot (tank controls): A/D turn `heading`, W/S walk along it. Returns the new
 * heading and the input the sim expects, which walks in screen directions of the top view
 * (right on screen is -x, up is +z).
 */
export function footInput(throttle: number, steer: number, heading: number, dt: number): { heading: number; throttle: number; steer: number } {
  const h = heading - steer * FOOT_TURN_RATE * dt;
  return { heading: h, throttle: throttle * Math.cos(h), steer: -throttle * Math.sin(h) };
}

/**
 * Where the camera stands and what it looks at, for a target at (x, z) heading `angle`
 * (forward is (sin, cos), as in sim/bus.ts). Pure, so the views are testable.
 */
export function cameraPose(mode: CameraMode, x: number, z: number, angle: number, onFoot = false): { pos: Vec3; look: Vec3 } {
  const fx = Math.sin(angle), fz = Math.cos(angle);
  // Bus space (lx to the left, lz forward) to world.
  const at = (lx: number, y: number, lz: number): Vec3 => ({ x: x + fx * lz + fz * lx, y, z: z + fz * lz - fx * lx });
  if (onFoot && mode !== 'top') {
    // A walker is smaller than a bus: the drone comes closer, both seat views become his eyes.
    if (mode === 'chase') return { pos: at(0, 2.2, -3.6), look: at(0, 0.7, 3) };
    return { pos: at(0, FOOT_EYE_Y, 0.15), look: at(0, FOOT_EYE_Y - 0.15, 1.2) };
  }
  switch (mode) {
    case 'top':
      // Top-down view, slightly tilted so boxes read as 3D.
      return { pos: { x, y: 34, z: z - 14 }, look: { x, y: 0, z } };
    case 'chase':
      // A drone close behind and above, looking a bit ahead of the bus.
      return { pos: at(0, 3.6, -5.5), look: at(0, 0.6, 5) };
    case 'cockpit':
      return { pos: at(EYE.x, EYE.y, EYE.z), look: at(EYE.x, EYE.y - 0.12, EYE.z + 1) };
    case 'eyes':
      // Same seat, a bit forward, so the road starts right under the view.
      return { pos: at(EYE.x, EYE.y, EYE.z + 0.5), look: at(EYE.x, EYE.y - 0.1, EYE.z + 1.5) };
  }
}

export const CAMERA_FOV: Record<CameraMode, number> = { top: 50, chase: 60, cockpit: 72, eyes: 75 };

const KEY = 'smelibus.camera';
function load(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function save(m: CameraMode) {
  try { localStorage.setItem(KEY, m); } catch { /* private mode */ }
}

/** The picked view, the C key and the HUD button. The choice is remembered in localStorage. */
export function createCameraMode(target: Window = window) {
  let mode = initialCameraMode(target.location.search, load());
  const buttons: HTMLButtonElement[] = [];
  const render = (btn: HTMLButtonElement) => {
    btn.textContent = CAMERA_ICONS[mode];
    btn.title = btn.ariaLabel = `Kamera: ${CAMERA_LABELS[mode]} (C)`;
  };
  function cycle() {
    mode = nextCameraMode(mode);
    save(mode);
    buttons.forEach(render);
  }
  target.addEventListener('keydown', (e) => {
    if (e.repeat || e.target instanceof HTMLInputElement) return;
    if (e.code === 'KeyC') cycle();
  });
  return {
    get mode() {
      return mode;
    },
    cycle,
    /** HUD toggle button, same look as the mute one. */
    button(): HTMLButtonElement {
      const btn = target.document.createElement('button');
      btn.type = 'button';
      btn.className = 'camera icon';
      btn.onclick = () => {
        cycle();
        btn.blur();
      };
      render(btn);
      buttons.push(btn);
      return btn;
    },
  };
}

/**
 * Inside of the driver's cab for the cockpit view: dashboard, wheel, pillars and the roof edge,
 * in bus space. Drawn instead of the own bus model, which would block the view.
 */
export function createCockpit() {
  const group = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2d33 });
  const grey = new THREE.MeshLambertMaterial({ color: 0x4a4f57 });
  const body = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const W = 0.4; // half width of the cab (the model is 5/6 tile wide)
  const FRONT = 1.46;

  // Dashboard across the whole front, a higher hood over the instruments in front of the driver.
  box(2 * W, 0.18, 0.3, dark, 0, 0.6, FRONT - 0.15);
  box(0.36, 0.06, 0.16, grey, EYE.x, 0.72, FRONT - 0.1);
  // Gauges: speedometer and a red stink meter.
  const gauge = (color: number, x: number) => {
    const g = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color }));
    g.position.set(x, 0.715, FRONT - 0.185);
    g.rotation.y = Math.PI;
    group.add(g);
  };
  gauge(0xf2f2e8, EYE.x + 0.07);
  gauge(0xd8432f, EYE.x - 0.07);
  // Ticket printer on the right of the dash, a typical Warsaw bus thing.
  box(0.14, 0.12, 0.12, grey, -0.22, 0.75, FRONT - 0.2);

  // Steering wheel: rim with spokes on a column, tilted toward the driver.
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 28), dark);
  wheel.add(rim);
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.01), grey);
    spoke.position.set(Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0);
    spoke.rotation.z = a;
    wheel.add(spoke);
  }
  const tilt = new THREE.Group();
  tilt.position.set(EYE.x, 0.76, FRONT - 0.26);
  // Top of the rim leans away from the driver, like a bus wheel lying almost flat.
  tilt.rotation.x = 0.9;
  tilt.add(wheel);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25), dark);
  column.rotation.x = Math.PI / 2;
  column.position.z = 0.13;
  tilt.add(column);
  group.add(tilt);

  // Windshield frame: pillars, roof edge with the destination sign box, the sill under the glass.
  box(0.06, 0.75, 0.06, body, W, 0.95, FRONT);
  box(0.06, 0.75, 0.06, body, -W, 0.95, FRONT);
  box(2 * W + 0.06, 0.12, 0.2, body, 0, 1.3, FRONT - 0.05);
  box(0.22, 0.04, 0.03, dark, 0, 1.2, FRONT - 0.1); // rear-view mirror
  // Side walls up to the window line, with a window post next to the driver.
  box(0.04, 0.5, FRONT, body, W + 0.02, 0.35, FRONT / 2);
  box(0.04, 0.5, FRONT, body, -W - 0.02, 0.35, FRONT / 2);
  box(0.04, 0.6, 0.05, body, W + 0.02, 0.95, 0.55);
  // Faint glass, so the windshield still reads as one.
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * W, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  );
  glass.position.set(0, 0.88, FRONT + 0.02);
  group.add(glass);

  let wheelTurn = 0;
  return {
    group,
    /** Bus colour on the frame; the wheel eases toward `steer` (-1..1, + is right). */
    update(color: number, steer: number, dt: number) {
      body.color.setHex(color);
      wheelTurn += (steer * 1.6 - wheelTurn) * (1 - Math.exp(-dt * 10));
      // Turning right is clockwise for the driver, who looks along +z: positive around +z.
      wheel.rotation.z = wheelTurn;
    },
  };
}
