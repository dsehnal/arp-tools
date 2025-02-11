import Dexie, { type EntityTable } from 'dexie';
import { uuid4 } from './uuid';

export interface SimpleStore<T> {
    name: string;
    add(v: T[]): Promise<string | string[]>;
    update(v: T[]): Promise<void>;
    remove(id: string): Promise<void>;
    get(id: string): Promise<T>;
    query(id: string | string[]): Promise<T[]>;
    __clear(): Promise<void>;
}

interface Entry {
    id: string;
    value: string;
}

const db = new Dexie('lims') as Dexie & {
    [name: string]: EntityTable<Entry, 'id'>;
};

export class IndexedDBStore<T> implements SimpleStore<T> {
    get table() {
        return db[this.name];
    }

    constructor(
        public name: string,
        public idColumn = 'id'
    ) {
        db.version(1).stores({ [name]: 'id,value' });
    }

    async add(v: T[]) {
        const items = v.map((x) => {
            let id = x[this.idColumn] as string;
            if (id) return { id, value: JSON.stringify(x) };
            id = uuid4();
            return { id, value: JSON.stringify({ ...x, id }) };
        });
        await db[this.name].bulkPut(items);
        return items.map((x) => x.id);
    }

    update(v: T[]): Promise<void> {
        return db[this.name].bulkPut(
            v.map((value) => ({ id: value[this.idColumn], value: JSON.stringify(value) }))
        ) as any;
    }

    remove(id: string | string[]): Promise<void> {
        return db[this.name].bulkDelete(Array.isArray(id) ? id : [id]);
    }

    async get(id: string): Promise<T> {
        const value = await db[this.name].get(id);
        if (value) return JSON.parse(value.value);
        throw new Error('Not found');
    }

    async query(id?: string | string[]): Promise<T[]> {
        const values = !id ? await db[this.name].toArray() : await db[this.name].bulkGet(Array.isArray(id) ? id : [id]);
        return values.filter((x) => !!x).map((x) => JSON.parse(x.value));
    }

    __clear(): Promise<void> {
        return db[this.name].clear();
    }
}

const stores = new Map<string, IndexedDBStore<any>>();

export function indexedStore<T>(name: string) {
    if (stores.has(name)) return stores.get(name)!;
    stores.set(name, new IndexedDBStore<T>(name));
    return stores.get(name)!;
}
