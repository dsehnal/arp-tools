export function splitString(str: string, sep: string | RegExp = /[\s,;]+/g) {
    if (!str) return [];
    return str.split(sep);
}

export function memoizeLatest<Args extends any[], T>(f: (...args: Args) => T): (...args: Args) => T {
    let lastArgs: any[] | undefined = void 0,
        value: any = void 0;
    return (...args) => {
        if (!lastArgs || lastArgs.length !== args.length) {
            lastArgs = args;
            // eslint-disable-next-line prefer-spread
            value = f.apply(void 0, args);
            return value;
        }
        for (let i = 0, _i = args.length; i < _i; i++) {
            if (args[i] !== lastArgs[i]) {
                lastArgs = args;
                // eslint-disable-next-line prefer-spread
                value = f.apply(void 0, args);
                return value;
            }
        }
        return value;
    };
}
