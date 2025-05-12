export const RoutingKind: 'browser' | 'hash' = 'hash';

export function resolveRoute(...parts: (string | undefined)[]) {
    return `/${parts.join('/')}`;
}

export function resolvePrefixedRoute(...parts: string[]) {
    const prefix = RoutingKind === 'hash' ? '#/' : '/';
    return `${prefix}${parts.join('/')}`;
}
