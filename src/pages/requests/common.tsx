import { BreadcrumbItem } from '../layout';
import { LuList } from 'react-icons/lu';

export const RequestsBreadcrumb: BreadcrumbItem = {
    icon: <LuList />,
    title: 'Requests',
    path: '/requests',
};

export function requestPath(id: string) {
    return `/requests/${id}`;
}

export function requestBreadcrumb({
    id,
    name,
    isLoading,
}: {
    isLoading?: boolean;
    id?: string;
    name?: string;
}): BreadcrumbItem | undefined {
    if (isLoading) return { title: 'Loading...' };
    if (!id) return undefined;
    return {
        title: name ?? id,
        path: requestPath(id),
    };
}
