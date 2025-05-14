import { DilutionCurve } from '@/lib/tools/model/curve';
import { createStore } from '../store';

const store = createStore<DilutionCurve>('curves');

export const CurvesApi = {
    list: () => store.query(),
    get: async (id: string): Promise<DilutionCurve | undefined> => (await store.query(id))[0],
    save: (value: DilutionCurve) => store.put([value]),
    remove: (id: string) => store.remove(id),
    __clear: () => store.__clear(),
};
