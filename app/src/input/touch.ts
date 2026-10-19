import type { BusInput } from '../shared/types';
import {
  TOUCH_AIM_COAST_SPEED, TOUCH_AIM_FULL_STEER_RAD, TOUCH_AIM_REVERSE_RAD,
  TOUCH_STICK_DEADZONE, TOUCH_STICK_RADIUS, TOUCH_STICK_STEP,
} from '../shared/config';

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
// Rounding keeps a resting thumb from changing the input every frame (each change is a new seq).
const quantize = (v: number) => {
  const q = Math.round(v / TOUCH_STICK_STEP) * TOUCH_STICK_STEP;
  return Math.abs(q) < 1e-9 ? 0 : q;
};

/** Thumb offset from the stick centre in px (screen y grows down) to throttle and steer. */
export function stickToInput(dx: number, dy: number, radius = TOUCH_STICK_RADIUS): Pick<BusInput, 'throttle' | 'steer'> {
  const len = Math.hypot(dx, dy);
  if (len < radius * TOUCH_STICK_DEADZONE) return { throttle: 0, steer: 0 };
  // Past the rim the thumb only sets the direction.
  const k = len > radius ? radius / len : 1;
  return { throttle: quantize(clamp1((-dy * k) / radius)), steer: quantize(clamp1((dx * k) / radius)) };
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Bus steering by aim: the stick points where the bus should go on screen, not where the wheels
 * turn. The camera looks along +z, so stick up is +z and stick right is -x (like walking).
 * A stopped bus backs up when the stick points behind it; a moving one turns around.
 */
export function aimToInput(
  dx: number, dy: number, bus: { angle: number; speed: number }, radius = TOUCH_STICK_RADIUS,
): Pick<BusInput, 'throttle' | 'steer'> {
  const len = Math.hypot(dx, dy);
  if (len < radius * TOUCH_STICK_DEADZONE) return { throttle: 0, steer: 0 };
  const power = Math.min(1, len / radius);
  const diff = wrapAngle(Math.atan2(-dx, -dy) - bus.angle);
  // Once backing up it keeps backing up while the stick points anywhere behind.
  const reverse = bus.speed < -0.1 ? Math.abs(diff) > Math.PI / 2 : bus.speed < 1 && Math.abs(diff) > TOUCH_AIM_REVERSE_RAD;
  if (reverse) {
    // Steering flips in reverse (sim/bus.ts), so the tail swings toward the stick.
    const tail = wrapAngle(diff - Math.PI);
    return { throttle: quantize(-power), steer: quantize(clamp1(tail / TOUCH_AIM_FULL_STEER_RAD)) };
  }
  const coast = Math.abs(diff) > Math.PI / 2 && bus.speed > TOUCH_AIM_COAST_SPEED;
  return { throttle: coast ? 0 : quantize(power), steer: quantize(clamp1(-diff / TOUCH_AIM_FULL_STEER_RAD)) };
}

/** Keyboard and touch together: axes add up, the use counters add up (a change is still one press). */
export function mergeInputs(a: BusInput, b: BusInput): BusInput {
  return {
    throttle: clamp1(a.throttle + b.throttle),
    steer: clamp1(a.steer + b.steer),
    use: (a.use ?? 0) + (b.use ?? 0),
    jump: (a.jump ?? 0) + (b.jump ?? 0),
    horn: (a.horn ?? 0) + (b.horn ?? 0),
  };
}

export const isTouchDevice = () =>
  matchMedia('(pointer: coarse)').matches;

/**
 * On-screen controls for phones: a floating stick on the right part of the screen (it appears
 * under the thumb) and small labelled buttons (enter/leave, horn) on the left. In a bus the stick
 * aims (aimToInput) or, in the close camera views, drives directly; on foot it walks. Hidden until the device is a touch one.
 */
export function createTouch(): { read(bus?: { angle: number; speed: number } | null, drive?: boolean): BusInput } {
  const layer = document.createElement('div');
  layer.className = 'touch';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="touch-zone"></div>
    <div class="touch-stick"><div class="touch-knob"></div></div>
    <div class="touch-buttons">
      <button class="touch-btn touch-use" type="button"><span class="ico">🚌</span><span class="txt">Wsiądź</span></button>
      <button class="touch-btn touch-horn" type="button"><span class="ico">📢</span><span class="txt">Klakson</span></button>
    </div>`;
  // Under #ui, so the HUD and the win screen stay clickable on top of it.
  document.body.insertBefore(layer, document.getElementById('ui'));
  const zone = layer.querySelector<HTMLDivElement>('.touch-zone')!;
  const stick = layer.querySelector<HTMLDivElement>('.touch-stick')!;
  const knob = layer.querySelector<HTMLDivElement>('.touch-knob')!;
  const useBtn = layer.querySelector<HTMLButtonElement>('.touch-use')!;
  const hornBtn = layer.querySelector<HTMLButtonElement>('.touch-horn')!;
  const useIco = useBtn.querySelector<HTMLSpanElement>('.ico')!;
  const useTxt = useBtn.querySelector<HTMLSpanElement>('.txt')!;

  const show = () => {
    layer.hidden = false;
    document.body.classList.add('touch-on');
  };
  if (isTouchDevice()) show();
  else addEventListener('touchstart', show, { once: true, passive: true });

  let thumb: { dx: number; dy: number } | null = null;
  let use = 0;
  let horn = 0;
  let pointer: number | null = null;
  let ox = 0, oy = 0;

  const place = (x: number, y: number) => {
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
  };
  const release = () => {
    pointer = null;
    thumb = null;
    knob.style.transform = '';
    stick.classList.remove('active');
    stick.style.left = stick.style.top = '';
  };

  zone.addEventListener('pointerdown', (e) => {
    if (pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    ox = e.clientX;
    oy = e.clientY;
    place(ox, oy);
    thumb = { dx: 0, dy: 0 };
    stick.classList.add('active');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - ox, dy = e.clientY - oy;
    thumb = { dx, dy };
    const len = Math.hypot(dx, dy);
    const k = len > TOUCH_STICK_RADIUS ? TOUCH_STICK_RADIUS / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    zone.addEventListener(type, (e) => {
      if (e.pointerId === pointer) release();
    });
  }

  const button = (btn: HTMLButtonElement, press: () => void) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      press();
      btn.classList.add('pressed');
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
      btn.addEventListener(type, () => btn.classList.remove('pressed'));
    }
  };
  button(useBtn, () => use++);
  button(hornBtn, () => horn++);
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('blur', release);

  let inBus: boolean | null = null;
  return {
    read: (bus, drive = false) => {
      if (inBus !== !!bus) {
        inBus = !!bus;
        useIco.textContent = inBus ? '🚶' : '🚌';
        useTxt.textContent = inBus ? 'Wysiądź' : 'Wsiądź';
      }
      // `drive`: the camera turns with the bus, so screen aim makes no sense; up is gas, sideways is the wheel.
      const axes = !thumb ? { throttle: 0, steer: 0 } : bus && !drive ? aimToInput(thumb.dx, thumb.dy, bus) : stickToInput(thumb.dx, thumb.dy);
      return { ...axes, use, horn };
    },
  };
}
