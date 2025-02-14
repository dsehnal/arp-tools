export function formatError(error: any): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error) return error.error;
    if (error.errors) return error.errors.join(', ');
    return JSON.stringify(error);
}
