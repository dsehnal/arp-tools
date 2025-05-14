import Dexie, { type EntityTable } from 'dexie';
import { uuid4 } from '../util/uuid';
import type { SimpleStore, SimpleStoreEntryBase } from '.';

interface Entry {
    id: string;
    created_on: string;
    modified_on: string;
    value: any;
}

function createDB() {
    return new Dexie('lims') as Dexie & {
        [name: string]: EntityTable<Entry, 'id'>;
    };
}

const DB_VERSION = 1;
const db = createDB();

export async function dropIndexedDB() {
    await db.delete();
}

class IndexedDBStore<T extends SimpleStoreEntryBase> implements SimpleStore<T> {
    get table() {
        return db[this.name];
    }

    constructor(
        public name: string,
        public idColumn = 'id'
    ) {
        db.version(DB_VERSION).stores({ [name]: 'id,created_on,modified_on,value' });
    }

    async put(xs: T[]) {
        const items = xs.map((x: T) => {
            const id = x[this.idColumn] || uuid4();
            const now = new Date().toISOString();
            const created_on = x.created_on || now;
            const modified_on = now;
            return { id, created_on, modified_on, value: { ...x, id, created_on, modified_on } };
        });
        await db[this.name].bulkPut(items);
        return items.map((x) => x.id);
    }

    remove(id: string | string[]): Promise<void> {
        return db[this.name].bulkDelete(Array.isArray(id) ? id : [id]);
    }

    async get(id: string): Promise<T> {
        const value = await db[this.name].get(id);
        if (value) return value.value;
        throw new Error('Not found');
    }

    async query(id?: string | string[]): Promise<T[]> {
        const values = !id ? await db[this.name].toArray() : await db[this.name].bulkGet(Array.isArray(id) ? id : [id]);
        return values
            .filter((x) => !!x)
            .sort((a, b) => {
                if (a.modified_on === b.modified_on) return a.id < b.id ? -1 : 1;
                return a.modified_on < b.modified_on ? 1 : -1;
            })
            .map((x) => x.value);
    }

    __clear(): Promise<void> {
        return db[this.name].clear();
    }
}

const stores = new Map<string, IndexedDBStore<any>>();

export function indexedDBStore<T extends SimpleStoreEntryBase>(name: string): SimpleStore<T> {
    if (stores.has(name)) return stores.get(name)!;
    stores.set(name, new IndexedDBStore<T>(name));
    return stores.get(name)!;
}
