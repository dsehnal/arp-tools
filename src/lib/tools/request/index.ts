import { parseCSV } from '@/lib/util/csv';
import { splitString } from '@/lib/util/misc';
import { ARPRequest, ARPRequestSample, ARPRequestSampleValidation } from '../model/request';
import { Bucket, BucketSampleInfo } from '../model/bucket';

export function parseRequestSamplesCSV(bucket: Bucket, csv: string) {
    const data = parseCSV(csv, ['Sample ID', 'Kinds', 'Source Label', 'Source Well', 'Comment']);

    if (!data.fieldMap['Sample ID']) {
        throw new Error('Missing Sample ID column');
    }

    const normalizeKind = (kind: string) => {
        const sampleInfo = bucket.sample_info.find((s) => s.kind.toLowerCase() === kind.toLowerCase());
        if (sampleInfo) return sampleInfo.kind;
        return kind;
    };

    const defaultKind = bucket.sample_info.find((s) => !s.is_control)?.kind;

    const samples = data.result.data
        .filter((row: any) => data.get(row, 'Sample ID'))
        .map((row: any) => {
            const kinds = splitString(data.get(row, 'Kinds').trim() ?? '', /\s+/g).map(normalizeKind);
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

export interface ARPRequestSampleInfo {
    request: ARPRequest;
    kindToInfo: Map<string, BucketSampleInfo>;
    sampleIdCounts: Map<string, number>;
    sampleKindCounts: Map<string, number>;
    pivots: Map<string, ARPRequestSample>;
}

export function getRequestSampleInfo(request: ARPRequest): ARPRequestSampleInfo {
    const sampleIdCounts = new Map<string, number>();
    const sampleKindCounts = new Map<string, number>();
    const kindToInfo = new Map<string, BucketSampleInfo>();
    const pivots = new Map<string, ARPRequestSample>();

    for (const sampleInfo of request.bucket.sample_info) {
        kindToInfo.set(sampleInfo.kind, sampleInfo);
    }

    for (const sample of request.samples) {
        const id = sample.id;
        if (!id) continue;

        if (!pivots.has(id)) {
            pivots.set(id, sample);
        }
        sampleIdCounts.set(id, (sampleIdCounts.get(id) ?? 0) + 1);

        for (const kind of sample.kinds) {
            sampleKindCounts.set(kind, (sampleKindCounts.get(kind) ?? 0) + 1);
        }
    }

    return { request, kindToInfo, sampleIdCounts, sampleKindCounts, pivots };
}

export function validateRequestSample(
    sample: ARPRequestSample,
    info: ARPRequestSampleInfo
): ARPRequestSampleValidation {
    const bucket = info.request.bucket;
    const entries: ARPRequestSampleValidation = [];

    if (!sample.kinds.length) {
        entries.push(['error', 'Sample kind is required']);
    }

    if ((info.sampleIdCounts.get(sample.id) ?? 0) > 1) {
        entries.push(['info', 'Duplicate Sample ID']);
    }

    for (const kind of sample.kinds) {
        const sampleInfo = info.kindToInfo.get(kind);
        if (sampleInfo?.is_control && (info.sampleKindCounts.get(kind) ?? 0) > 1) {
            entries.push(['error', 'Each control kind can only be used once']);
        }
    }

    for (const kind of sample.kinds) {
        const sampleInfo = bucket.sample_info.find((s) => s.kind === kind);
        if (!sampleInfo) {
            entries.push(['error', `Sample kind '${kind}' is not defined in the bucket`]);
        }
    }

    if (!sample.source_label || !sample.source_well) {
        entries.push(['error', 'Source location is not specified']);
    }

    const pivot = info.pivots.get(sample.id);
    if (pivot?.source_label !== sample.source_label || pivot?.source_well !== sample.source_well) {
        entries.push(['error', 'All instances of the same Sample ID must have the same location']);
    }

    return entries;
}
