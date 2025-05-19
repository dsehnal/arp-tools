import { PlateLayouts, PlateUtils } from '../plate';
import { test, expect } from 'vitest';

test('plate utils', () => {
    expect(PlateUtils.rowMajorToColMajorIndex(PlateLayouts[24], 1)).toBe(4);
    expect(PlateUtils.colMajorToRowMajorIndex(PlateLayouts[24], 1)).toBe(6);
    expect(PlateUtils.labelToCoords('B2')).toEqual([1, 1]);
});
