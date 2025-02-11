import { BehaviorSubject } from 'rxjs';
import { useBehavior } from '../hooks/use-behavior';
import { DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from '@/components/ui/dialog';
import { Button, DialogCloseTrigger } from '@chakra-ui/react';
import { FC } from 'react';

export interface DialogProps<T, S> {
    title: string;
    body: FC<{ state: BehaviorSubject<S> | undefined; model: T | undefined }>;
    onOk?: (state?: S) => any;

    model?: T;
    state?: BehaviorSubject<S>;
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
}

export const DialogService = new _DialogService();

export function DialogProvider() {
    const current = useBehavior(DialogService.current);
    if (!current) return null;

    const Body = current.body;

    return (
        <DialogRoot open>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{current.title}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Body state={current.state} model={current.model} />
                </DialogBody>
                <DialogFooter>
                    <Button colorPalette='blue' onClick={DialogService.onOk}>
                        OK
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger onClick={DialogService.close} />
            </DialogContent>
        </DialogRoot>
    );
}
