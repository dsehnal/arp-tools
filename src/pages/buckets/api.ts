import { indexedStore } from '@/lib/simple-store';
import { Bucket } from '@/model/bucket';

const store = indexedStore<Bucket>('buckets');

export const BucketsApi = {
    list: () => store.query(),
    get: async (id: string): Promise<Bucket | undefined> => (await store.query(id))[0],
    save: (value: Bucket) => store.update([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
