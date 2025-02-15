export function formatISODateString(date: string | undefined) {
    if (!date) return '';
    return new Date(Date.parse(date)).toLocaleString();
}
