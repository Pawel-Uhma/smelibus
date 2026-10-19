import { describe, expect, it } from 'vitest';
import { cameraPose, initialCameraMode, nextCameraMode } from './camera';

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
