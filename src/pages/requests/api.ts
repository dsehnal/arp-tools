import { indexedStore } from '@/lib/simple-store';
import { ARPRequest } from '@/model/request';

const store = indexedStore<ARPRequest>('arp-requests');

export const RequestsApi = {
    list: () => store.query(),
    get: async (id: string): Promise<ARPRequest | undefined> => (await store.query(id))[0],
    save: (value: ARPRequest) => store.update([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
