function isMac() {
    if ('userAgentData' in window.navigator) {
        return (window.navigator as any).userAgentData?.platform === 'macOS';
    } else if (typeof window.navigator.platform === 'string') {
        return window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    } else {
        return /Mac/i.test(navigator.userAgent);
    }
}

export const CtrlOrMeta = isMac() ? 'Ctrl/⌘' : 'Ctrl';

export function isEventTargetInput(e: Event) {
    return e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
}

export function isActiveElementInput() {
    const e = document.activeElement;
    return e instanceof HTMLElement && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA');
}
