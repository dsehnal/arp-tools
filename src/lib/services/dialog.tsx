import {
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
} from '@/components/ui/dialog';
import { Box, Button } from '@chakra-ui/react';
import { FC, ReactNode, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useBehavior } from '../hooks/use-behavior';
import { formatError } from '../util/error';
import { isEventTargetInput } from '../util/events';

export interface DialogProps<T, S> {
    title: string;
    body: FC<{ state?: BehaviorSubject<S>; model?: T }>;
    okContent?: string;
    onOk?: (state?: S) => any;
    options?: { noFooter?: boolean; cancelButton?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' };
    model?: T;
    state?: BehaviorSubject<S>;
}

export interface ConfirmDialogProps {
    title: string;
    message: ReactNode;
    onOk: () => any;
}

class _DialogService {
    dialog = new BehaviorSubject<DialogProps<any, any> | null>(null);
    state = new BehaviorSubject<{ isLoading?: boolean; error?: string }>({ isLoading: false });

    show = <T, S>(props: DialogProps<T, S>) => {
        this.state.next({});
        this.dialog.next(props);
    };

    close = () => {
        this.state.next({});
        this.dialog.next(null);
    };

    tryClose = () => {
        if (this.state.value.isLoading) return;

        this.state.next({});
        this.dialog.next(null);
    };

    onOk = async () => {
        const current = this.dialog.value;
        if (!current) return;

        try {
            this.state.next({ isLoading: true });
            await current.onOk?.(current.state?.value);
            this.close();
        } catch (error) {
            this.state.next({ error: formatError(error) });
        }
    };

    confirm(props: ConfirmDialogProps) {
        this.show({
            title: props.title,
            body: () => <>{props.message}</>,
            onOk: props.onOk,
            options: { cancelButton: true },
        });
    }
}

export const DialogService = new _DialogService();

export function DialogProvider() {
    const current = useBehavior(DialogService.dialog);
    const state = useBehavior(DialogService.state);

    useEffect(() => {
        if (!current) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Check target is not input or textarea by tagname
            if (isEventTargetInput(e)) {
                return;
            }

            e.stopPropagation();
            e.preventDefault();

            if (DialogService.state.value.isLoading) return;
            if (e.key === 'Enter') {
                DialogService.onOk();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [current]);

    if (!current) return null;

    const Body = current.body;

    return (
        <DialogRoot open onEscapeKeyDown={DialogService.tryClose} size={current.options?.size}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{current.title}</DialogTitle>
                    <DialogCloseTrigger onClick={DialogService.close} disabled={state.isLoading} />
                </DialogHeader>
                <DialogBody>
                    <Body state={current.state} model={current.model} />
                </DialogBody>
                {!current.options?.noFooter && (
                    <DialogFooter>
                        {state.error && <Box color='fg.error'>{state.error}</Box>}
                        {current.options?.cancelButton && (
                            <Button variant='outline' onClick={DialogService.close} disabled={state.isLoading}>
                                Cancel
                            </Button>
                        )}
                        <Button colorPalette='blue' onClick={DialogService.onOk} loading={state.isLoading}>
                            {current.okContent || 'OK'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </DialogRoot>
    );
}
