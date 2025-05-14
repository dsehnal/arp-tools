import { ARPRequest } from '@/lib/tools/model/request';
import { createStore } from '../store';

const store = createStore<ARPRequest>('arp-requests');

export const RequestsApi = {
    list: () => store.query(),
    get: async (id: string): Promise<ARPRequest | undefined> => (await store.query(id))[0],
    save: (value: ARPRequest) => store.put([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
