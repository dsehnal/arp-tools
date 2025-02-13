import { BreadcrumbItem } from '../layout';
import { LuList } from 'react-icons/lu';
import { resolveRoute } from '../routing';

export const RequestsBreadcrumb: BreadcrumbItem = {
    icon: <LuList />,
    title: 'Requests',
    path: 'requests',
};

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
        path: resolveRoute(RequestsBreadcrumb.path!, id),
    };
}
