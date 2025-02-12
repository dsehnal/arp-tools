import { Bucket } from './bucket';

export type ARPRequestStatus = 'new' | 'in-progress' | 'completed' | 'cancelled';

export interface ARPRequestSample {
    id: string;
}

export interface ARPRequest {
    id?: string;
    name: string;
    description: string;
    n_copies: number;
    bucket: Bucket;
    status: ARPRequestStatus;
    samples: ARPRequestSample[];
    // created_on?: DateLike
    // needed_by?: DateLike
}
