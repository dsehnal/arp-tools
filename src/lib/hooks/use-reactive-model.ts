import { useEffect } from 'react';
import { ReactiveModel } from '../reactive-model';

export function useReactiveModel<T extends ReactiveModel>(model: T | undefined): T | undefined {
    useEffect(() => {
        if (!model) return;
        model.mount();
        return () => model.dispose();
    }, [model]);
    return model;
}
