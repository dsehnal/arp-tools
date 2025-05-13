import { Plate, PlateDimensions } from './plate';

export interface Rackscan {
    label?: string;
    dimensions?: PlateDimensions;
    wells: Record<string, string>; // well -> sample_id
}

export interface LiquidTransfer {
    source_label: string;
    source_well: string;
    destination_label: string;
    destination_well: string;
    volume_l: number;
    concentration_m?: number;
    sample_id?: string;
    comment?: string;
}

export interface ProductionTransfer {
    source_plate_index: number;
    source_label: string;
    source_well: string;
    volume_l: number;
    concentration_m?: number;
}

export interface ProductionWell {
    // kind: 'source' | 'intermediate' | 'final';
    sample_id: string;
    sample_kind?: string;
    volume_l: number;
    concentration_m?: number;
    transfers: ProductionTransfer[];
    comment?: string;
}

export interface ProductionPlate {
    kind: 'nARP' | 'intermediate' | 'arp';
    index: number;
    copy?: number;

    label: string;
    plate: Plate<ProductionWell>;
}

export interface ARPProductionResult {
    errors: string[];
    warnings: string[];
    plates: ProductionPlate[];
}
