export function splitString(str: string, sep: string | RegExp = /[\s,;]+/g) {
    if (!str) return [];
    return str.split(sep);
}
