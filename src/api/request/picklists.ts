import { PlateUtils } from '../model/plate';
import { ProductionPlate } from '../model/production';
import { ARPRequest } from '../model/request';
import { roundValue } from '@/lib/util/math';

export function compilePicklist(request: ARPRequest, plate: ProductionPlate) {
    const Columns = ['Source Label', 'Source Well', 'Destination Label', 'Destination Well', 'Volume', 'Volume Unit'];

    const rows: string[][] = [Columns];

    let wellIndex = 0;
    for (const well of plate.plate.wells) {
        const wI = wellIndex++;
        if (!well) continue;

        for (const transfer of well.transfers) {
            const row: string[] = [
                transfer.source_label,
                transfer.source_well,
                request.production.plate_labels?.[plate.label] ?? plate.label,
                PlateUtils.rowMajorWellIndexToLabel(plate.plate.dimensions, wI),
                `${roundValue(transfer.volume_l * 1e9, 0)}`,
                'nL', // TODO: use uL for nARP
            ];

            rows.push(row);
        }
    }

    return rows.map((row) => row.join(',')).join('\n');
}
