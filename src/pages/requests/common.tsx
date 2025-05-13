import { BreadcrumbItem } from '../layout';
import { resolveRoute } from '../routing';
import { ReactNode } from 'react';
import { FaRobot } from 'react-icons/fa';

export const RequestsBreadcrumb: BreadcrumbItem = {
    icon: <FaRobot />,
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
    name?: ReactNode;
}): BreadcrumbItem | undefined {
    if (isLoading) return { title: 'Loading...' };
    if (!id) return undefined;
    return {
        title: name ?? id,
        path: resolveRoute(RequestsBreadcrumb.path!, id),
    };
}
