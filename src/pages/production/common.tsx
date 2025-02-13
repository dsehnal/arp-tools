import { BreadcrumbItem } from '../layout';
import { FaRobot } from 'react-icons/fa';
import { resolveRoute } from '../routing';

export const ProductionBreadcrumb: BreadcrumbItem = {
    icon: <FaRobot />,
    title: 'Production',
    path: 'production',
};

export function productionBreadcrumb({
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
        path: resolveRoute(ProductionBreadcrumb.path!, id),
    };
}
