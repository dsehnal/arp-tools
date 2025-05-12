export function splitString(str: string, sep: string | RegExp = /[\s,;]+/g) {
    return str.split(sep);
}
