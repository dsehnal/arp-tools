import { DilutionCurve } from '@/api/model/curve';
import { PlateDimensions, PlateLayouts, PlateUtils } from './plate';

export interface BucketData {
    kind: 'bucket';
    version: 1;
    data: Bucket;
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

    normalize_solvent: 'per-kind' | 'global' | 'no';

    curve?: DilutionCurve;
    sample_info: BucketSampleInfo[];

    source_labware: BucketLabware;
    intermediate_labware: BucketLabware;
    arp_labware: BucketLabware;

    template: (BucketTemplateWell | null | undefined)[];
}

const DefaultLabware: BucketLabware = {
    name: '',
    shorthand: '',
    dimensions: PlateLayouts[384],
    dead_volume_l: 2.5e-6,
    well_volume_l: 10e-6,
};

export const DefaultBucket: Bucket = {
    name: '',
    description: '',
    project: '',
    source_labware: DefaultLabware,
    intermediate_labware: DefaultLabware,
    arp_labware: DefaultLabware,
    normalize_solvent: 'global',
    sample_info: [
        { kind: 'cmpd' },
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

export function writeBucket(bucket: Bucket): BucketData {
    const data: Bucket = { ...bucket };
    delete data.id;
    delete data.created_on;
    delete data.modified_on;
    return { kind: 'bucket', version: 1, data };
}

export function readBucket(data: BucketData): Bucket {
    if (data.kind !== 'bucket' || data.version !== 1) {
        throw new Error('Invalid bucket data');
    }
    return data.data;
}
