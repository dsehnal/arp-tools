import { DilutionCurve } from '@/model/curve';
import { Plate, PlateLayouts, PlateUtils } from './plate';

export interface BucketSampleInfo {
    kind: string;
    default_sample_id?: string;
    curve?: DilutionCurve;
    is_control?: boolean;
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

    sample_info: BucketSampleInfo[];

    template: Plate<BucketTemplateWell>;
}

export const DefaultBucket: Bucket = {
    name: '',
    description: '',
    project: '',
    source_labware: '',
    arp_labware: '',
    normalize_solvent: 'global',
    sample_info: [
        { kind: 'compound' },
        { kind: 'ctrl+', is_control: true },
        { kind: 'ctrl-', is_control: true },
        { kind: 'ref', is_control: true },
    ],
    template: PlateUtils.empty(PlateLayouts[384]),
};

export function getBucketTemplateWellKey(well?: BucketTemplateWell | null) {
    if (well?.kind || typeof well?.sample_index === 'number') return `${well.kind ?? '?'}-${well.sample_index}`;
    return undefined;
}

export const BucketLayouts = [
    ['24', '24 Well'],
    ['96', '96 Well'],
    ['384', '384 Well'],
    ['1536', '1536 Well'],
] as [string, string][];
