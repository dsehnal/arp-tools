export function formatUnit(value: number | undefined, unit: string, options?: { compact?: boolean }) {
    if (typeof value !== 'number') return '';
    if (value > 1e-3) return `${Math.round(1e5 * value) / 1e2}${options?.compact ? '' : ' '}m${unit}`;
    if (value > 1e-6) return `${Math.round(1e8 * value) / 1e2}${options?.compact ? '' : ' '}u${unit}`;
    if (value > 1e-9) return `${Math.round(1e10 * value) / 10}${options?.compact ? '' : ' '}n${unit}`;
    return `${Math.round(1e12 * value) / 1e3}${options?.compact ? '' : ' '}n${unit}`;
}
