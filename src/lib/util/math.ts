export function roundValue(value: number, digits: number) {
    const f = Math.pow(10, digits);
    return Math.round(f * value) / f;
}

export function roundFactor(value: number, f: number) {
    return Math.round(f * value) / f;
}

export function isRelativelyClose(a: number, b: number, threshold: number) {
    return Math.abs(a - b) < threshold * Math.max(Math.abs(a), Math.abs(b));
}
