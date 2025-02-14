import { toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';
import { formatError } from '../error';

class _ToastService {
    show(options: {
        title: ReactNode;
        duration?: number;
        type?: 'info' | 'success' | 'warning' | 'error';
        id?: string;
    }) {
        toaster.create(options);
    }

    hide(id: string) {
        toaster.remove(id);
    }

    success(title: string, options?: { duration?: number; id?: string }) {
        this.show({ duration: options?.duration ?? 3500, id: options?.id, title, type: 'success' });
    }

    error(error: any, options?: { duration?: number; id?: string }) {
        this.show({ ...options, title: formatError(error), type: 'error' });
    }

    warning(title: string, options?: { duration?: number; id?: string }) {
        this.show({ ...options, title, type: 'warning' });
    }

    info(title: string, options?: { duration?: number; id?: string }) {
        this.show({ ...options, title, type: 'info' });
    }
}

export const ToastService = new _ToastService();
