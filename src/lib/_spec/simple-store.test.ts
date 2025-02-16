import 'fake-indexeddb/auto';
import { indexedStore } from '../simple-store';

describe('simple-store', () => {
    const store = indexedStore<any>('test');
    store.__clear();

    it('works', async () => {
        const ids = await store.put([{ value: 'a' }, { value: 'b' }]);
        const _1 = await store.get(ids[0]);
        expect(_1.value).toBe('a');
        const all = await store.query(ids);
        expect(all.length).toBe(2);

        await store.remove(ids[0]);
        const _1_ = await store.query([ids[0]]);
        expect(_1_.length).toBe(0);

        await store.put([{ id: ids[1], value: 'c' }]);
        const _2 = await store.get(ids[1]);
        expect(_2.value).toBe('c');
    });
});
