import { DilutionCurve } from '@/model/curve';
import { Plate, PlateLayouts, PlateUtils } from './plate';

export interface BucketSampleInfo {
    default_sample_id?: string;
    curve?: DilutionCurve;
}

export interface BucketTemplateWell {
    kind?: string;
    sample_index?: number;
    point_index?: number;
}

export interface Bucket {
    id?: string;

    name: string;
    description: string;
    project: string;

    normalize_solvent: 'per-curve' | 'global' | 'no';

    source_labware: string;
    arp_labware: string;

    sample_info: { [kind: string]: BucketSampleInfo };

    template: Plate<BucketTemplateWell>;
}

export const DefaultBucket: Bucket = {
    name: '',
    description: '',
    project: '',
    source_labware: '',
    arp_labware: '',
    normalize_solvent: 'global',
    sample_info: {},
    template: PlateUtils.empty(PlateLayouts[384]),
};

export function getBucketTemplateWellKey(well?: BucketTemplateWell | null) {
    if (well?.kind || typeof well?.sample_index === 'number') return `${well.kind ?? '?'}-${well.sample_index}`;
    return undefined;
}
