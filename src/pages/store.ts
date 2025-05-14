import { SimpleStore, SimpleStoreEntryBase } from '@/lib/store';
import { dropIndexedDB, indexedDBStore } from '@/lib/store/indexed-db';

export function resetDB() {
    return dropIndexedDB();
}

export function createStore<T extends SimpleStoreEntryBase>(name: string): SimpleStore<T> {
    return indexedDBStore(name);
}
