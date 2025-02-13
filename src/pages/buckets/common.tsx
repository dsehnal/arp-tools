import { PlateModel } from '@/lib/plate';
import * as d3c from 'd3-scale-chromatic';
import { BreadcrumbItem } from '../layout';
import { LuLayoutGrid } from 'react-icons/lu';
import { Bucket, getBucketTemplateWellKey } from '@/model/bucket';
import { resolveRoute } from '../routing';

export const BucketsBreadcrumb: BreadcrumbItem = {
    icon: <LuLayoutGrid />,
    title: 'Buckets',
    path: 'buckets',
};

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
        path: resolveRoute(BucketsBreadcrumb.path!, id),
    };
}

export function updateBucketTemplatePlate(plate: PlateModel, bucket: Bucket) {
    const { template, arp_labware } = bucket;

    const keys = new Map<string, number>();

    for (const well of template) {
        const key = getBucketTemplateWellKey(well);
        if (!keys.has(key!)) {
            keys.set(key!, keys.size);
        }
    }

    plate.update({
        dimensions: arp_labware.dimensions,
        colors: template.map((w) => {
            const key = getBucketTemplateWellKey(w);
            if (!key) return undefined;
            return d3c.interpolateWarm(keys.get(key)! / (keys.size - 1 || 1));
        }),
        labels: template.map((w) => {
            if (!w) return undefined;

            let ret = '';
            if (w.kind) ret += w.kind;
            if (typeof w.sample_index === 'number') ret += `${w.sample_index + 1}`;
            if (typeof w.point_index === 'number') {
                if (ret) ret += ':';
                ret += `${w.point_index + 1}`;
            }
            return ret || undefined;
        }),
    });
}
