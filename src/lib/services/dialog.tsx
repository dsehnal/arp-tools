import { BehaviorSubject } from 'rxjs';
import { useBehavior } from '../hooks/use-behavior';
import {
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogCloseTrigger,
} from '@/components/ui/dialog';
import { Button } from '@chakra-ui/react';
import { FC, ReactNode, useEffect } from 'react';

export interface DialogProps<T, S> {
    title: string;
    body: FC<{ state?: BehaviorSubject<S>; model?: T }>;
    onOk?: (state?: S) => any;

    options?: { cancelButton?: boolean };
    model?: T;
    state?: BehaviorSubject<S>;
}

export interface ConfirmDialogProps {
    title: string;
    message: ReactNode;
    onOk: () => any;
}

class _DialogService {
    current = new BehaviorSubject<DialogProps<any, any> | null>(null);
    show = <T, S>(props: DialogProps<T, S>) => this.current.next(props);
    close = () => this.current.next(null);

    onOk = async () => {
        const current = this.current.value;
        if (!current) return;
        await current.onOk?.(current.state?.value);
        this.close();
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
    const current = useBehavior(DialogService.current);
    if (!current) return null;

    const Body = current.body;

    return (
        <DialogRoot open onEscapeKeyDown={DialogService.close}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{current.title}</DialogTitle>
                    <DialogCloseTrigger onClick={DialogService.close} />
                </DialogHeader>
                <DialogBody>
                    <Body state={current.state} model={current.model} />
                </DialogBody>
                <DialogFooter>
                    {current.options?.cancelButton && (
                        <Button variant='outline' onClick={DialogService.close}>
                            Cancel
                        </Button>
                    )}
                    <Button colorPalette='blue' onClick={DialogService.onOk}>
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
}
