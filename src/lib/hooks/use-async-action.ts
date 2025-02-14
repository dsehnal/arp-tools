import { useRef, useState } from 'react';
import { ToastService } from '../services/toast';

export interface UseAsyncActionState<T> {
    isLoading?: boolean;
    error?: Error;
    result?: T;
}

export type UseAsyncAction<T> = [run: (action: Promise<T>) => Promise<T | undefined>, UseAsyncActionState<T>];

export function useAsyncAction<T>(options?: {
    rethrowError?: boolean;
    onError?: 'state' | 'toast' | 'eat';
}): UseAsyncAction<T> {
    const [state, setState] = useState<UseAsyncActionState<T>>({});
    const runId = useRef(0);

    const run = async (action: Promise<T>) => {
        const id = ++runId.current;
        setState({ isLoading: true });

        try {
            const result = await action;
            if (id === runId.current) {
                setState({ result });
            }
            return result;
        } catch (error) {
            if (id === runId.current) {
                if (options?.onError === 'toast') {
                    ToastService.error(error, { duration: 5000 });
                    setState({});
                } else if (options?.onError === 'state') {
                    setState({ error });
                } else {
                    setState({});
                }
            }
            if (options?.rethrowError) {
                throw error;
            }
        }
    };

    return [run, state];
}
