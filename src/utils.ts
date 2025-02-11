export function createFloatArray(size: number): number[] {
    const ret = new Array(size);
    ret[0] = 0.1; // Force floating point backing array
    for (let i = 1; i < size; i++) ret[i] = 0;
    ret[0] = 0;
    return ret;
}

export function roundValue(value: number, digits: number) {
    const f = Math.pow(10, digits);
    return Math.round(f * value) / f;
}

export function roundNano(value: number) {
    return Math.round(1e10 * value) / 1e10;
}

export function toNano(value: number) {
    return Math.round(1e10 * value) / 10;
}

export function formatConc(value: number) {
    if (value > 1e-3) return `${Math.round(1e5 * value) / 1e2} mM`;
    if (value > 1e-6) return `${Math.round(1e8 * value) / 1e2} uM`;
    return `${Math.round(1e9 * value)} nM`;
}
