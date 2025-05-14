import { uuid4 } from '@/lib/util/uuid';
import { Bucket, writeBucket } from './bucket';

export interface ARPRequestData {
    kind: 'arp-request';
    version: 1;
    data: ARPRequest;
}

export type ARPRequestStatus = 'new' | 'in-progress' | 'completed' | 'closed';

export const ARPRequestStatusOptions: [string, string][] = [
    ['new', 'New'],
    ['in-progress', 'In Progress'],
    ['completed', 'Completed'],
    ['closed', 'Closed'],
];

export interface ARPRequestSample {
    id: string;
    kinds: string[];
    source_label?: string;
    source_well?: string;
    comment?: string;
}

export type ARPRequestSampleValidation = ['error' | 'warning' | 'info', string][];

export interface ARPRequest {
    id?: string;
    created_on?: string;
    modified_on?: string;

    name: string;
    description: string;
    n_copies: number;
    bucket: Bucket;
    status: ARPRequestStatus;
    samples: ARPRequestSample[];
    production: {
        plate_labels?: Record<string, string | undefined>;
    };
}

export function createARPRequest(bucket: Bucket): ARPRequest {
    return {
        id: uuid4(),
        name: '',
        description: '',
        bucket: { ...writeBucket(bucket).data },
        n_copies: 1,
        status: 'new',
        samples: [],
        production: {},
    };
}

export function writeARPRequest(request: ARPRequest): ARPRequestData {
    const data = { ...request };
    delete data.id;
    delete data.created_on;
    delete data.modified_on;
    return { kind: 'arp-request', version: 1, data };
}
