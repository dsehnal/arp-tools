import { PlateLayouts, PlateUtils } from '../plate';

test('plate utils', () => {
    expect(PlateUtils.rowMajorToColMajorIndex(PlateLayouts[24], 1)).toBe(4);
    expect(PlateUtils.colMajorToRowMajorIndex(PlateLayouts[24], 1)).toBe(6);
    expect(PlateUtils.labelToCoords('B2')).toBe([1, 1]);
});
