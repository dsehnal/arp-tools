import { PlateModel } from '@/lib/components/plate';
import * as d3s from 'd3-scale-chromatic';
import * as d3c from 'd3-color';
import { BreadcrumbItem } from '../layout';
import { LuLayoutGrid } from 'react-icons/lu';
import { Bucket, getBucketTemplateWellKey } from '@/api/model/bucket';
import { resolveRoute } from '../routing';
import { ReactNode } from 'react';

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
    name?: ReactNode;
}): BreadcrumbItem | undefined {
    if (isLoading) return { title: 'Loading...' };
    if (!id) return undefined;
    return {
        title: name ?? id,
        path: resolveRoute(BucketsBreadcrumb.path!, id),
    };
}

export function updateBucketTemplatePlate(plate: PlateModel, bucket: Bucket) {
    const { template, arp_labware, sample_info } = bucket;

    const infos = new Map(sample_info.map((s) => [s.kind, s]));
    const ctrlKeys = new Map<string, number>();
    const sampleKeys = new Map<string, number>();
    const maxPointIndex = new Map<string, number>();

    for (const well of template) {
        if (!well) continue;

        const key = getBucketTemplateWellKey(well);

        const isControl = infos.get(well.kind!)?.is_control;
        const keys = isControl ? ctrlKeys : sampleKeys;

        if (!keys.has(key!)) {
            keys.set(key!, keys.size);
        }

        if (typeof well.point_index === 'number') {
            const max = maxPointIndex.get(key!) ?? -1;
            maxPointIndex.set(key!, Math.max(max, well.point_index));
        }
    }

    plate.update({
        dimensions: arp_labware.dimensions,
        colors: template.map((w) => {
            const key = getBucketTemplateWellKey(w);
            if (!key || !w) return undefined;
            const isControl = infos.get(w.kind!)?.is_control;
            const keys = isControl ? ctrlKeys : sampleKeys;
            const t = keys.get(key)! / (keys.size - 1 || 1) || 0;

            // TODO: cache this?
            let color = isControl ? d3s.interpolateCividis(t) : d3s.interpolateWarm(t);
            if (typeof w.point_index === 'number') {
                const hsl = d3c.hsl(color);
                const maxIndex = maxPointIndex.get(key)! || 1;
                if (maxIndex > 1) {
                    hsl.l = 0.5 + (0.4 * w.point_index) / maxIndex;
                    color = d3c.rgb(hsl).formatRgb();
                }
            }

            return color;
        }),
        labels: template.map((w) => {
            if (!w) return undefined;

            let index = '';
            if (typeof w.sample_index === 'number') index += `${w.sample_index + 1}`;
            if (typeof w.point_index === 'number') {
                if (index) index += '-';
                index += `${w.point_index + 1}`;
            }

            if (!index && !w.kind) return undefined;
            if (index && w.kind) return { header: w.kind, main: index };
            return index || w.kind;
        }),
    });
}
