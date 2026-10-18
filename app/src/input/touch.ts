import type { BusInput } from '../shared/types';
import { TOUCH_STICK_DEADZONE, TOUCH_STICK_RADIUS, TOUCH_STICK_STEP } from '../shared/config';

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
 * On-screen controls for phones: a floating stick on the left part of the screen (it appears
 * under the thumb), an E button and a smaller horn button on the right. Hidden until the device is a touch one.
 */
export function createTouch(): { read(): BusInput } {
  const layer = document.createElement('div');
  layer.className = 'touch';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="touch-zone"></div>
    <div class="touch-stick"><div class="touch-knob"></div></div>
    <button class="touch-use" type="button" aria-label="Wsiądź / wysiądź">E</button>
    <button class="touch-horn" type="button" aria-label="Klakson">H</button>`;
  // Under #ui, so the HUD and the win screen stay clickable on top of it.
  document.body.insertBefore(layer, document.getElementById('ui'));
  const zone = layer.querySelector<HTMLDivElement>('.touch-zone')!;
  const stick = layer.querySelector<HTMLDivElement>('.touch-stick')!;
  const knob = layer.querySelector<HTMLDivElement>('.touch-knob')!;
  const useBtn = layer.querySelector<HTMLButtonElement>('.touch-use')!;
  const hornBtn = layer.querySelector<HTMLButtonElement>('.touch-horn')!;

  const show = () => {
    layer.hidden = false;
    document.body.classList.add('touch-on');
  };
  if (isTouchDevice()) show();
  else addEventListener('touchstart', show, { once: true, passive: true });

  let axes = { throttle: 0, steer: 0 };
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
    axes = { throttle: 0, steer: 0 };
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
    stick.classList.add('active');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - ox, dy = e.clientY - oy;
    axes = stickToInput(dx, dy);
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

  return { read: () => ({ ...axes, use, horn }) };
}
