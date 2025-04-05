import { useCallback, useSyncExternalStore } from 'react';
import { BehaviorSubject, skip } from 'rxjs';

export function useBehavior<T>(s: BehaviorSubject<T>): T;
export function useBehavior<T>(s: BehaviorSubject<T> | undefined): T | undefined;
export function useBehavior<T>(s: BehaviorSubject<T> | undefined): T | undefined {
    return useSyncExternalStore(
        useCallback(
            (callback: () => void) => {
                if (!s) {
                    return () => {};
                }
                const sub = s.pipe(skip(1)).subscribe(callback)!;
                return () => sub?.unsubscribe();
            },
            [s]
        ),
        useCallback(() => s?.value, [s])
    );
}
