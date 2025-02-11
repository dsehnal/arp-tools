import { DilutionCurve } from '@/model/curve';
import { Plate, PlateLayouts, PlateUtils } from './plate';

export interface BucketControl {
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

    curve?: DilutionCurve;
    normalize_solvent: 'per-curve' | 'global' | 'no';

    source_labware: string;
    arp_labware: string;

    controls: { [kind: string]: BucketControl };

    template: Plate<BucketTemplateWell>;
}

export const DefaultBucket: Bucket = {
    name: '',
    description: '',
    project: '',
    source_labware: '',
    arp_labware: '',
    normalize_solvent: 'global',
    controls: {},
    template: PlateUtils.empty(PlateLayouts[384]),
};

export function getBucketTemplateWellKey(well?: BucketTemplateWell | null) {
    if (well?.kind) return well.kind;
    if (typeof well?.sample_index === 'number') return `S${well.sample_index}`;
    return undefined;
}
