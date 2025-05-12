export function arrayEqual<T>(arr1: T[], arr2: T[]) {
    const length = arr1.length;
    if (length !== arr2.length) return false;
    for (let i = 0; i < length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export function resizeArray<T>(xs: T[], newSize: number, empty: T) {
    if (xs.length > newSize) return xs.slice(0, newSize);
    const ret = [...xs];
    for (let i = xs.length; i < newSize; i++) {
        ret.push(empty);
    }
    return ret;
}

export function arrayMapAdd<K, V>(map: Map<K, V[]>, k: K, v: V) {
    if (!map.has(k)) {
        map.set(k, [v]);
    } else {
        map.get(k)!.push(v);
    }
}

export function setMapAdd<K, V>(map: Map<K, Set<V>>, k: K, v: V) {
    if (!map.has(k)) {
        map.set(k, new Set([v]));
    } else {
        map.get(k)!.add(v);
    }
}

export function createFloatArray(size: number): number[] {
    const ret = new Array(size);
    ret[0] = 0.1; // Force floating point backing array
    for (let i = 1; i < size; i++) ret[i] = 0;
    ret[0] = 0;
    return ret;
}
