import { describe, expect, it } from 'vitest';
import { BONUS_STINK } from '../shared/config';
import type { BonusKind } from '../shared/types';
import { BONUS_VOXEL_SIZE, bonusGeometry, bonusVoxels } from './bonusModels';

const KINDS = [...Object.keys(BONUS_STINK), 'dropped'] as BonusKind[];

describe('bonus models', () => {
  it.each(KINDS)('%s has a model that stands on the ground and fits a bus lane', (kind) => {
    expect(bonusVoxels(kind).length).toBeGreaterThan(10);
    const geo = bonusGeometry(kind);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.x - box.min.x).toBeLessThan(1.5);
    expect(box.max.z - box.min.z).toBeLessThan(1.5);
  });

  it('is deterministic', () => {
    expect(bonusVoxels('durian')).toEqual(bonusVoxels('durian'));
    expect(BONUS_VOXEL_SIZE).toBeGreaterThan(0);
  });
});
