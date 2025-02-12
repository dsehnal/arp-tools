import { BreadcrumbItem } from '../layout';
import { LuChartNoAxesCombined } from 'react-icons/lu';

export const CurvesBreadcrumb: BreadcrumbItem = {
    icon: <LuChartNoAxesCombined />,
    title: 'Curves',
    path: '/curves',
};

export function curvePath(id: string) {
    return `/curves/${id}`;
}

export function curveBreadcrumb({
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
        path: curvePath(id),
    };
}
