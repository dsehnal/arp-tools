import { PlateUtils } from '../model/plate';
import { ProductionPlate } from '../model/production';
import { ARPRequest } from '../model/request';
import { roundValue } from '@/lib/util/math';

export function compilePicklist(request: ARPRequest, plate: ProductionPlate) {
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

    const isNArp = plate.kind === 'nARP';

    let wellIndex = 0;
    for (const well of plate.plate.wells) {
        const wI = wellIndex++;
        if (!well) continue;

        for (const transfer of well.transfers) {
            const row: string[] = [
                request.production.plate_labels?.[transfer.source_label] ??
                    (!isNArp ? `<${transfer.source_label}>` : transfer.source_label),
                transfer.source_well,
                request.production.plate_labels?.[plate.label] ?? `<${plate.label}>`,
                PlateUtils.rowMajorWellIndexToLabel(plate.plate.dimensions, wI),
                `${roundValue(transfer.volume_l * (isNArp ? 1e6 : 1e9), 0)}`,
                isNArp ? 'uL' : 'nL',
                transfer.concentration_m ? well.sample_id : '<solvent>',
            ];

            rows.push(row);
        }
    }

    return rows.map((row) => row.join(',')).join('\n');
}
