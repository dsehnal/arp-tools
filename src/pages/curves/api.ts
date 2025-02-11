import { indexedStore } from '@/lib/simple-store';
import { DilutionCurve } from '@/model/curve';

const store = indexedStore<DilutionCurve>('curves');

export const CurvesApi = {
    list: () => store.query(),
    get: async (id: string): Promise<DilutionCurve | undefined> => (await store.query(id))[0],
    save: (value: DilutionCurve) => store.update([value]),
    __clear: () => store.__clear(),
};
