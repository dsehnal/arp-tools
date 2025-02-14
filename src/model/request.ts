import { uuid4 } from '@/lib/uuid';
import { Bucket } from './bucket';

export type ARPRequestStatus = 'new' | 'in-progress' | 'completed' | 'closed';

export const ARPRequestStatusOptions: [string, string][] = [
    ['new', 'New'],
    ['in-progress', 'In Progress'],
    ['completed', 'Completed'],
    ['closed', 'Closed'],
];

export interface ARPRequestSample {
    id: string;
    kind: string;
}

export interface ARPRequest {
    id: string;
    created_on?: string;
    modified_on?: string;

    name: string;
    description: string;
    n_copies: number;
    bucket: Bucket;
    status: ARPRequestStatus;
    samples: ARPRequestSample[];
    // created_on?: DateLike
    // needed_by?: DateLike
}

export function createARPRequest(bucket: Bucket): ARPRequest {
    return {
        id: uuid4(),
        name: '',
        description: '',
        bucket,
        n_copies: 1,
        status: 'new',
        samples: [],
    };
}
