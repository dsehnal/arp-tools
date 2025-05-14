import { Button, ButtonProps } from '@chakra-ui/react';
import { useAsyncAction } from '../hooks/use-async-action';

export interface AsyncActionButtonProps extends ButtonProps {
    action: () => Promise<void>;
    onActionError?: 'toast' | 'eat';
}

export function AsyncActionButton({ onActionError, children, action, ...props }: AsyncActionButtonProps) {
    const [run, state] = useAsyncAction({ onError: onActionError ?? 'toast' });

    return (
        <Button {...props} loading={state.isLoading} onClick={() => run(action())}>
            {children}
        </Button>
    );
}
