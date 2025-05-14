import { Bucket } from './model/bucket';
import { DilutionCurve } from './model/curve';
import { PlateUtils } from './model/plate';

export function validateBucket(bucket: Bucket) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const infos = new Map(bucket.sample_info.map((i) => [i.kind, i]));
    const allCurves: DilutionCurve[] = [];
    if (bucket.curve) {
        checkCurve(bucket, bucket.curve, errors);
        allCurves.push(bucket.curve);
    }
    for (const info of bucket.sample_info) {
        if (info.curve) {
            checkCurve(bucket, info.curve, errors, info.kind);
            allCurves.push(info.curve);
        } else if (!bucket.curve) {
            errors.push(`${info.kind}: No curve assigned`);
        }
    }

    if (new Set(allCurves.map((c) => c.options.intermediate_volume_l)).size > 1) {
        warnings.push('Supplied curves do not have the same intermediate volume');
    }

    const presentKinds = new Set<string>();
    PlateUtils.forEachColMajorIndex(bucket.arp_labware.dimensions, (idx, row, col) => {
        const well = bucket.template[idx];
        if (!well) return;

        const info = infos.get(well.kind ?? '');
        const label = PlateUtils.wellLabel(row, col);

        if (well.kind) {
            presentKinds.add(well.kind);
        } else {
            errors.push(`${label}: Well kind not assigned`);
        }

        if (typeof well.point_index !== 'number') {
            errors.push(`${label}: Point index not assigned`);
        } else {
            const curve = info?.curve ?? bucket.curve;
            if (!curve?.points[well.point_index]) {
                errors.push(`${label}: Invalid curve point index`);
            }
        }
        if (info?.is_control && typeof well.sample_index !== 'number') {
            errors.push(`${label}: Sample index not assigned`);
        }
    });

    return { errors, warnings };
}

function checkCurve(bucket: Bucket, curve: DilutionCurve, errors: string[], kind?: string) {
    if (curve.options.intermediate_volume_l > bucket.source_labware.well_volume_l) {
        return errors.push(`Curve ${kind ? `for ${kind} ` : ''}intermediate volume extends source labware well volume`);
    }
}
