import { BreadcrumbItem } from '../layout';
import { LuChartNoAxesCombined } from 'react-icons/lu';
import { resolveRoute } from '../routing';
import { ReactNode } from 'react';

export const CurvesBreadcrumb: BreadcrumbItem = {
    icon: <LuChartNoAxesCombined />,
    title: 'Curves',
    path: 'curves',
};

export function curveBreadcrumb({
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
        path: resolveRoute(CurvesBreadcrumb.path!, id),
    };
}
