import { roundValue } from '@/lib/util/math';
import { formatUnit } from '@/lib/util/units';

export interface DilutionCurveData {
    kind: 'dilution-curve';
    version: 1;
    data: DilutionCurve;
}

export interface DilutionTransfer {
    concentration_m: number;
    volume_l: number;
}

export interface DilutionPoint {
    target_concentration_m: number;
    actual_concentration_m: number;
    transfers: DilutionTransfer[];
}

export interface DilutionCurve {
    id?: string;
    created_on?: string;
    modified_on?: string;

    name?: string;
    options: DilutionCurveOptions;

    nARP_concentration_M: number;
    intermediate_points: DilutionPoint[][];
    points: DilutionPoint[];
}

export interface DilutionCurveOptions {
    source_concentration_m: number;
    intermediate_volume_l: number;
    assay_volume_l: number;
    max_intermadiate_plates: number;
    max_intermediate_points_per_plate: number;

    top_concentration_m: number;
    n_points: number;
    dilution_factor: number;
    tolerance: number;

    adjust_intermediate_volume?: boolean;
    single_source_transfers?: boolean;

    min_transfer_volume_l: number;
    max_transfer_volume_l: number;
    max_intermediate_transfer_volume_l: number;
    droplet_size_l: number;
    num_intermediate_point_samples: number;

    // manualIntermediates?: number[][];
}

export type CurvePoints = number[];
export type IntermediateConcentrations = number[][];
export type IntermediateVolumes = number[];

export const DefaultCurveOptions: DilutionCurveOptions = {
    source_concentration_m: 10e-3,
    intermediate_volume_l: 10e-6,
    assay_volume_l: 60e-6,
    max_intermadiate_plates: 2,
    max_intermediate_points_per_plate: 2,

    top_concentration_m: 10e-6,
    n_points: 9,
    dilution_factor: Math.sqrt(10),
    tolerance: 0.1,
    adjust_intermediate_volume: true,
    single_source_transfers: false,

    min_transfer_volume_l: 2.5e-9,
    max_transfer_volume_l: 60e-9,
    max_intermediate_transfer_volume_l: 1e-6,
    droplet_size_l: 2.5e-9,
    num_intermediate_point_samples: 20,
};

export function formatCurve(curve: DilutionCurve) {
    const info = `${curve.points.length}pt src:${formatUnit(curve.options?.source_concentration_m, 'M', {
        compact: true,
    })} top:${formatUnit(curve.points[0].target_concentration_m, 'M', { compact: true })} f:${roundValue(
        curve.options?.dilution_factor ?? 0,
        2
    )} arp:${formatUnit(curve.options?.assay_volume_l, 'L', { compact: true })} int:${formatUnit(
        curve.options?.intermediate_volume_l,
        'L',
        { compact: true }
    )}`;
    return curve.name ? `${curve.name}, ${info}` : info;
}

export function writeCurve(curve: DilutionCurve): DilutionCurveData {
    const data = { ...curve };
    delete data.id;
    delete data.created_on;
    delete data.modified_on;
    return { kind: 'dilution-curve', version: 1, data };
}

export function readCurve(data: DilutionCurveData): DilutionCurve {
    if (data.kind !== 'dilution-curve' || data.version !== 1) {
        throw new Error('Invalid curve data');
    }
    return data.data;
}
