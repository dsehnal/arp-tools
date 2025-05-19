import { BehaviorSubject } from 'rxjs';

function getDefaultTheme(): 'light' | 'dark' {
    try {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || theme === 'light') {
            return theme;
        }
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
    } catch {
        return 'dark';
    }
}

export function setTheme(theme: 'light' | 'dark') {
    try {
        ColorTheme.next(theme);
        localStorage.setItem('theme', theme);
    } catch {
        // Ignore errors
    }
}

export const ColorTheme = new BehaviorSubject<'light' | 'dark'>(getDefaultTheme());
