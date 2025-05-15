export const RoutingKind: 'browser' | 'hash' = 'hash';

export function resolveRoute(...parts: (string | undefined)[]) {
    return `/${parts.map((p) => (p?.startsWith('/') ? p.substring(1) : p)).join('/')}`;
}

export function resolvePrefixedRoute(...parts: string[]) {
    const prefix = RoutingKind === 'hash' ? '#/' : '/';
    return `${prefix}${parts.join('/')}`;
}
