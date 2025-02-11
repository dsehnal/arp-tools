import { useEffect, useState } from "react";

export function useAsyncModel<T, Args extends any[]>(factory: (...args: Args) => Promise<T>, args: Args): { model?: T, loading?: boolean, error?: any } {
    const [state, setState] = useState<{ model?: T, loading?: boolean, error?: any }>({});
  
    useEffect(() => {
        let mounted = true;
        async function init() {
            try {
                setState({ loading: true });
                const model = await factory(...args);
                if (!mounted) return;
                setState({ model });
            } catch (error) {
                if (!mounted) return;
                setState({ error });
            }
        };
        init();
        return () => {
            mounted = false;
        };
    }, args);

    return state;
}