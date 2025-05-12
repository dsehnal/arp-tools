import { parseCSV } from '@/lib/util/csv';
import { splitString } from '@/lib/util/misc';
import { ARPRequestSample, ARPRequestSampleValidation } from './model/request';
import { Bucket } from './model/bucket';

export function parseRequestSamplesCSV(csv: string) {
    const data = parseCSV(csv, ['Sample ID', 'Kinds', 'Source Label', 'Source Well', 'Comment']);

    if (!data.fieldMap['Sample ID']) {
        throw new Error('Missing Sample ID column');
    }

    const defaultKind = this.request.bucket.sample_info.find((s) => !s.is_control)?.kind;

    const samples = data.result.data
        .filter((row: any) => data.get(row, 'Sample ID'))
        .map((row: any) => {
            const kinds = splitString(data.get(row, 'Kinds').trim() ?? '');
            if (kinds.length === 0 && defaultKind) kinds.push(defaultKind);

            return {
                id: data.get(row, 'Sample ID'),
                kinds,
                source_label: data.get(row, 'Source Label'),
                source_well: data.get(row, 'Source Well'),
                comment: data.get(row, 'Comment'),
            } satisfies ARPRequestSample;
        });

    return samples;
}

export function validateRequestSample(sample: ARPRequestSample, bucket: Bucket): ARPRequestSampleValidation {
    const entries: ARPRequestSampleValidation = [];

    if (!sample.kinds.length) {
        entries.push(['error', 'Sample kind is required']);
    }

    for (const kind of sample.kinds) {
        const sampleInfo = bucket.sample_info.find((s) => s.kind === kind);
        if (!sampleInfo) {
            entries.push(['error', `Sample kind '${kind}' is not defined in the bucket`]);
        }
    }

    if (!sample.source_label) {
        entries.push(['warning', 'Source Label is not specified']);
    }
    if (!sample.source_well) {
        entries.push(['error', 'Source Well is not specified']);
    }

    return entries;
}
