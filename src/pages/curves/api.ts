import { indexedStore } from '@/lib/simple-store';
import { DilutionCurve } from '@/api/model/curve';

const store = indexedStore<DilutionCurve>('curves');

export const CurvesApi = {
    list: () => store.query(),
    get: async (id: string): Promise<DilutionCurve | undefined> => (await store.query(id))[0],
    save: (value: DilutionCurve) => store.put([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
