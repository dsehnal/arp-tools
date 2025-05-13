import { writeCSV } from '@/lib/util/csv';
import { PlateUtils, WellCoords } from '../model/plate';
import { ProductionPlate, ProductionTransfer, ProductionWell } from '../model/production';
import { ARPRequest } from '../model/request';
import { roundValue } from '@/lib/util/math';

export function writePlatemaps(request: ARPRequest, plates: ProductionPlate[]) {
    const Columns = [
        'Plate Label',
        'Well Label',
        'Sample ID',
        'Sample Kind',
        'Volume',
        'Volume Unit',
        'Concentration',
        'Concentration Unit',
    ];

    const rows: string[][] = [Columns];

    for (const plate of plates) {
        const plateRows = writePlatemap(request, plate);
        for (const row of plateRows) {
            rows.push(row);
        }
    }
    
    return writeCSV(rows, ',');
}

function writePlatemap(request: ARPRequest, plate: ProductionPlate) {
    const rows: string[][] = [];
    PlateUtils.forEachColMajorWell(plate.plate, (well, rowMajorIndex, row, col) => {
        rows.push([
            // 'Plate Label',
            request.production.plate_labels?.[plate.label] ?? `<${plate.label}>`,
            // 'Well Label',
            PlateUtils.wellLabel(row, col),
            // 'Sample ID',
            well?.sample_id ?? '',
            // 'Sample Kind',
            well?.sample_kind ?? '',
            // 'Volume',
            well?.volume_l ? `${roundValue(well.volume_l * 1e9, 0)}` : '',
            // 'Volume Unit',
            'nL',
            // 'Concentration',
            well?.concentration_m ? `${roundValue(well.concentration_m * 1e9, 0)}` : '',
            // 'Concentration Unit',
            'nM',
        ]);
    });
    return rows;
}

export function writePicklists(request: ARPRequest, plates: ProductionPlate[]) {
    const Columns = [
        'Source Label',
        'Source Well',
        'Destination Label',
        'Destination Well',
        'Volume',
        'Volume Unit',
        'Sample ID',
    ];

    const rows: string[][] = [Columns];

    for (let i = 0; i < plates.length; i++) {
        const plate = plates[i];
        const plateIndexing = i % 2 ? 'descending' : 'ascending';
        const plateRows = writePicklist(request, plate, plateIndexing);
        for (const row of plateRows) {
            rows.push(row);
        }
    }

    return writeCSV(rows, ',');
}

function writePicklist(request: ARPRequest, plate: ProductionPlate, plateIndexing: 'ascending' | 'descending') {
    const rows: string[][] = [];

    const isNArp = plate.kind === 'nARP';

    const transfers: [ProductionTransfer, ProductionWell, number][] = [];

    let wellIndex = 0;
    for (const well of plate.plate.wells) {
        const wI = wellIndex++;
        if (!well) continue;
        for (const transfer of well.transfers) {
            transfers.push([transfer, well, wI]);
        }
    }

    const cA: WellCoords = [0, 0];
    const cB: WellCoords = [0, 0];
    transfers.sort((a, b) => {
        const aI = a[0].source_plate_index;
        const bI = b[0].source_plate_index;
        if (aI !== bI) return plateIndexing === 'descending' ? bI - aI : aI - bI;

        PlateUtils.labelToCoords(a[0].source_well, cA);
        PlateUtils.labelToCoords(b[0].source_well, cB);

        if (cA[0] !== cB[0]) return cA[0] - cB[0];
        if (cA[1] !== cB[1]) return cA[1] - cB[1];

        const aLabel = a[0].source_label;
        const bLabel = b[0].source_label;
        if (aLabel !== bLabel) return aLabel.localeCompare(bLabel);

        return a[2] - b[2];
    });

    for (const [transfer, well, wI] of transfers) {
        rows.push([
            request.production.plate_labels?.[transfer.source_label] ??
                (!isNArp ? `<${transfer.source_label}>` : transfer.source_label),
            transfer.source_well,
            request.production.plate_labels?.[plate.label] ?? `<${plate.label}>`,
            PlateUtils.rowMajorWellIndexToLabel(plate.plate.dimensions, wI),
            `${roundValue(transfer.volume_l * (isNArp ? 1e6 : 1e9), 0)}`,
            isNArp ? 'uL' : 'nL',
            transfer.concentration_m ? well.sample_id : '<solvent>',
        ]);
    }

    return rows;
}
