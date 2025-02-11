export interface DilutionTransfer {
    concentration_m: number;
    volumeL: number;
}

export interface DilutionPoint {
    target_concentration_m: number;
    actual_concentration_m: number;
    transfers: DilutionTransfer[];
}

export interface DilutionCurve {
    id?: string;

    name?: string;
    options?: DilutionCurveOptions;

    nARP_concentration_m: number;
    intermediate_points: DilutionPoint[][];
    points: DilutionPoint[];
}

export interface DilutionCurveOptions {
    nARP_concentration_M: number;
    intermediate_volume_l: number;
    assay_volume_l: number;
    max_intermadiate_plates: number;
    max_intermediate_points_per_plate: number;

    top_concentration_m: number;
    num_points: number;
    dilution_factor: number;
    tolerance: number;
    adjust_intermediate_volume: boolean;

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
    nARP_concentration_M: 10e-3,
    intermediate_volume_l: 10e-6,
    assay_volume_l: 60e-6,
    max_intermadiate_plates: 2,
    max_intermediate_points_per_plate: 2,

    top_concentration_m: 10e-6,
    num_points: 9,
    dilution_factor: Math.sqrt(10),
    tolerance: 0.1,
    adjust_intermediate_volume: true,

    min_transfer_volume_l: 2.5e-9,
    max_transfer_volume_l: 60e-9,
    max_intermediate_transfer_volume_l: 1e-6,
    droplet_size_l: 2.5e-9,
    num_intermediate_point_samples: 20,
};
