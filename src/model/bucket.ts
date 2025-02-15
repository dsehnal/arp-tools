import { DilutionCurve } from '@/model/curve';
import { PlateDimensions, PlateLayouts, PlateUtils } from './plate';

export interface BucketData {
    kind: 'bucket';
    version: 1;
    bucket: Bucket;
}

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

export interface BucketLabware {
    name: string;
    shorthand: string;
    dimensions: PlateDimensions;
    dead_volume_l: number;
    well_volume_l: number;
}

export interface Bucket {
    id?: string;
    created_on?: string;
    modified_on?: string;

    name: string;
    description: string;
    project: string;

    normalize_solvent: 'per-curve' | 'global' | 'no';

    sample_info: BucketSampleInfo[];

    source_labware: BucketLabware;
    arp_labware: BucketLabware;

    template: (BucketTemplateWell | null | undefined)[];
}

export const DefaultBucket: Bucket = {
    name: '',
    description: '',
    project: '',
    source_labware: {
        name: '',
        shorthand: '',
        dimensions: PlateLayouts[384],
        dead_volume_l: 2.5e-6,
        well_volume_l: 10e-6,
    },
    arp_labware: {
        name: '',
        shorthand: '',
        dimensions: PlateLayouts[384],
        dead_volume_l: 2.5e-6,
        well_volume_l: 10e-6,
    },
    normalize_solvent: 'global',
    sample_info: [
        { kind: 'compound' },
        { kind: 'ctrl+', is_control: true },
        { kind: 'ctrl-', is_control: true },
        { kind: 'ref', is_control: true },
    ],
    template: PlateUtils.emptyWells(PlateLayouts[384]),
};

export function getBucketTemplateWellKey(well?: BucketTemplateWell | null) {
    if (well?.kind || typeof well?.sample_index === 'number') return `${well.kind ?? '?'}-${well.sample_index ?? '?'}`;
    return undefined;
}

export const BucketLayouts = [
    ['24', '24 Well'],
    ['96', '96 Well'],
    ['384', '384 Well'],
    ['1536', '1536 Well'],
] as [string, string][];

export function readBucket(data: BucketData): Bucket {
    if (data.kind !== 'bucket' || data.version !== 1) {
        throw new Error('Invalid bucket data');
    }
    return data.bucket;
}
