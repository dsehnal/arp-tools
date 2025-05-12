export function formatUnit(value: number | undefined, unit: string, options?: { compact?: boolean }) {
    if (typeof value !== 'number') return '';
    if (value > 1e-3) return `${Math.round(1e5 * value) / 1e2}${options?.compact ? '' : ' '}m${unit}`;
    if (value > 1e-6) return `${Math.round(1e8 * value) / 1e2}${options?.compact ? '' : ' '}u${unit}`;
    return `${Math.round(1e9 * value)}${options?.compact ? '' : ' '}n${unit}`;
}
