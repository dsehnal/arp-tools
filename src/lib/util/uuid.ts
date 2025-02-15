export function uuid4(): string {
    let d = +new Date() + now();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid as any;
}

const now: () => number = (function () {
    if (typeof window !== 'undefined' && window.performance) {
        const perf = window.performance;
        return () => perf.now();
    } else if (
        typeof process !== 'undefined' &&
        (process as any).hrtime !== 'undefined' &&
        typeof process.hrtime === 'function'
    ) {
        return () => {
            const t = process.hrtime();
            return t[0] * 1000 + t[1] / 1000000;
        };
    } else if (Date.now) {
        return () => Date.now();
    } else {
        return () => +new Date();
    }
})();
