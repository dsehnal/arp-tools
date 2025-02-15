import { toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';
import { formatError } from '../util/error';

class _ToastService {
    show(options: {
        title: ReactNode;
        description?: ReactNode;
        duration?: number;
        type?: 'info' | 'success' | 'warning' | 'error';
        id?: string;
    }) {
        toaster.create(options);
    }

    hide(id: string) {
        toaster.remove(id);
    }

    success(title: string, options?: { description?: ReactNode; duration?: number; id?: string }) {
        this.show({
            description: options?.description,
            duration: options?.duration ?? 3500,
            id: options?.id,
            title,
            type: 'success',
        });
    }

    error(error: any, options?: { description?: ReactNode; duration?: number; id?: string }) {
        this.show({ ...options, title: formatError(error), type: 'error' });
    }

    warning(title: string, options?: { description?: ReactNode; duration?: number; id?: string }) {
        this.show({ ...options, title, type: 'warning' });
    }

    info(title: string, options?: { description?: ReactNode; duration?: number; id?: string }) {
        this.show({ ...options, title, type: 'info' });
    }
}

export const ToastService = new _ToastService();
