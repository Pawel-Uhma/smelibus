import { describe, expect, it } from 'vitest';
import { CITY_STREETS } from '../shared/config';
import { generateWorld } from '../sim/world';
import { streetlightSpots } from './streetlights';

describe('street lamps', () => {
  const world = generateWorld(3, 2, true, false);
  const spots = streetlightSpots(world);

  it('line the streets, never on buildings', () => {
    expect(spots.length).toBeGreaterThan(10);
    for (const sp of spots) {
      expect(world.tiles[Math.floor(sp.z) * world.size + Math.floor(sp.x)].kind).not.toBe('building');
      expect(Math.hypot(sp.dx, sp.dz)).toBeCloseTo(1);
    }
  });

  it('stand just outside the carriageway, facing it', () => {
    for (const sp of spots) {
      const s = world.streets!.find((st) => {
        const len = Math.hypot(st.bx - st.ax, st.bz - st.az);
        const ux = (st.bx - st.ax) / len, uz = (st.bz - st.az) / len;
        const t = (sp.x - st.ax) * ux + (sp.z - st.az) * uz;
        const off = Math.abs(-(sp.x - st.ax) * uz + (sp.z - st.az) * ux);
        const p = CITY_STREETS[st.kind];
        return t > 0 && t < len && Math.abs(off - (p.median + p.road + 0.2)) < 1e-6;
      });
      expect(s).toBeDefined();
      // A step toward the road gets closer to the street's centreline.
      const d = (x: number, z: number) => Math.abs(-(x - s!.ax) * (s!.bz - s!.az) + (z - s!.az) * (s!.bx - s!.ax));
      expect(d(sp.x + sp.dx, sp.z + sp.dz)).toBeLessThan(d(sp.x, sp.z));
    }
  });
});
