import { isRelativelyClose } from '@/lib/util/math';
import { describe, expect, it } from 'vitest';
import { aliasConcentration } from '../curve';
import { DefaultCurveOptions } from '../model/curve';

describe('curve builder', () => {
    it('alias concentration', () => {
        const v = 895e-6;
        const aliased = aliasConcentration(DefaultCurveOptions, true, 0, 0, [[0.01]], v, undefined);
        expect(isRelativelyClose(v, aliased, 0.05)).toBe(true);
    });
});
