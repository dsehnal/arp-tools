import { BreadcrumbItem } from '../layout';
import { LuLayoutGrid } from 'react-icons/lu';

export const BucketsBreadcrumb: BreadcrumbItem = {
    icon: <LuLayoutGrid />,
    title: 'Buckets',
    path: '/buckets',
};

export function bucketPath(id: string) {
    return `/buckets/${id}`;
}

export function bucketBreadcrumb({
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
        path: bucketPath(id),
    };
}
