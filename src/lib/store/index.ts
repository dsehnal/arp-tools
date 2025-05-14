export type SimpleStoreEntryBase = { id?: string; created_on?: string; modified_on?: string };

export interface SimpleStore<T extends SimpleStoreEntryBase> {
    name: string;
    put(v: T[]): Promise<string[]>;
    remove(id: string | string[]): Promise<void>;
    get(id: string): Promise<T>;
    query(id?: string | string[]): Promise<T[]>;
    __clear(): Promise<void>;
}
