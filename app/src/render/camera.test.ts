import { describe, expect, it } from 'vitest';
import { FOOT_TURN_RATE, cameraPose, footInput, initialCameraMode, nextCameraMode } from './camera';

describe('camera modes', () => {
  it('cycles through all views and back', () => {
    expect(nextCameraMode('top')).toBe('chase');
    expect(nextCameraMode('chase')).toBe('cockpit');
    expect(nextCameraMode('cockpit')).toBe('eyes');
    expect(nextCameraMode('eyes')).toBe('top');
  });
  it('takes the URL over the stored choice and ignores junk', () => {
    expect(initialCameraMode('?kamera=eyes', 'chase')).toBe('eyes');
    expect(initialCameraMode('', 'chase')).toBe('chase');
    expect(initialCameraMode('', 'nope')).toBe('top');
    expect(initialCameraMode('', null)).toBe('top');
  });
});

describe('cameraPose', () => {
  it('puts the drone behind the bus, looking ahead of it', () => {
    // Heading +x.
    const { pos, look } = cameraPose('chase', 10, 10, Math.PI / 2);
    expect(pos.x).toBeLessThan(10);
    expect(look.x).toBeGreaterThan(10);
    expect(pos.z).toBeCloseTo(10);
  });
  it('seats the driver on the left side, at the front, looking forward', () => {
    // Heading +z: the bus's left is +x.
    const { pos, look } = cameraPose('cockpit', 10, 10, 0);
    expect(pos.x).toBeGreaterThan(10);
    expect(pos.z).toBeGreaterThan(10);
    expect(pos.y).toBeLessThan(1.33);
    expect(look.z).toBeGreaterThan(pos.z);
  });
});

describe('on foot', () => {
  it('A/D turn the walker, W walks along the heading in the sim\'s screen directions', () => {
    const turned = footInput(0, 1, 0, 0.5);
    expect(turned.heading).toBeCloseTo(-FOOT_TURN_RATE * 0.5);
    expect(turned.throttle).toBe(0);
    // Heading +x (angle π/2): the sim walks +x when steer is -1 (right on screen is -x).
    const f = footInput(1, 0, Math.PI / 2, 0);
    expect(f.throttle).toBeCloseTo(0);
    expect(f.steer).toBeCloseTo(-1);
  });

  it('keeps the close views on foot, closer than for a bus', () => {
    const bus = cameraPose('chase', 0, 0, 0);
    const foot = cameraPose('chase', 0, 0, 0, true);
    expect(foot.pos.y).toBeLessThan(bus.pos.y);
    expect(cameraPose('eyes', 0, 0, 0, true).pos.y).toBeGreaterThan(1);
  });
});
