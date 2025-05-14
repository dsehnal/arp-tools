import { Bucket } from '@/lib/tools/model/bucket';
import { createStore } from '../store';

const store = createStore<Bucket>('buckets');

export const BucketsApi = {
    list: () => store.query(),
    get: async (id: string): Promise<Bucket | undefined> => (await store.query(id))[0],
    save: (value: Bucket) => store.put([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
