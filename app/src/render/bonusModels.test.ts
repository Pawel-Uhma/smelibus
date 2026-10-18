import { describe, expect, it } from 'vitest';
import { BONUS_STINK } from '../shared/config';
import type { BonusKind } from '../shared/types';
import { BONUS_VOXEL_SIZE, ZUL_VARIANTS, bonusGeometry, bonusVoxels, zulGeometry, zulVariant } from './bonusModels';

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

  it.each(ZUL_VARIANTS.flatMap((v) => [[v, 'walk'], [v, 'rest']] as const))('drunk %s (%s) stands on the ground and fits a bus lane', (variant, pose) => {
    const geo = zulGeometry(variant, pose);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.x - box.min.x).toBeLessThan(1.5);
    expect(box.max.z - box.min.z).toBeLessThan(1.5);
  });

  it('gives every drunk one of the three looks by id, all of them in use', () => {
    expect(new Set([0, 1, 2, 3, 4, 5].map(zulVariant))).toEqual(new Set(ZUL_VARIANTS));
    expect(zulVariant(7)).toBe(zulVariant(7));
    expect(zulGeometry('crate', 'rest')).not.toBe(zulGeometry('crate', 'walk'));
  });

  it('is deterministic', () => {
    expect(bonusVoxels('durian')).toEqual(bonusVoxels('durian'));
    expect(BONUS_VOXEL_SIZE).toBeGreaterThan(0);
  });
});
