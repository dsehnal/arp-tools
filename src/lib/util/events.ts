export const CtrlOrMeta = 'Ctrl/⌘';

export function isEventTargetInput(e: Event) {
    return e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
}
