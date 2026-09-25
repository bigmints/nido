import { openDB, type IDBPDatabase } from "idb";
import type { AppData } from "./schema";

/**
 * Data-access boundary. The UI and the backup code only talk to this interface,
 * so tests can use the in-memory implementation.
 * Photos are stored as compressed data URLs, keyed by id.
 */
export interface Repository {
  getAll(): Promise<Partial<AppData>>;
  set<K extends keyof AppData>(key: K, value: AppData[K]): Promise<void>;
  getPhoto(id: string): Promise<string | undefined>;
  putPhoto(id: string, dataUrl: string): Promise<void>;
  deletePhoto(id: string): Promise<void>;
  allPhotos(): Promise<Record<string, string>>;
  clear(): Promise<void>;
}

export class MemoryRepository implements Repository {
  private kv = new Map<string, unknown>();
  private photos = new Map<string, string>();

  async getAll() {
    return Object.fromEntries(this.kv) as Partial<AppData>;
  }
  async set<K extends keyof AppData>(key: K, value: AppData[K]) {
    this.kv.set(key, structuredClone(value));
  }
  async getPhoto(id: string) {
    return this.photos.get(id);
  }
  async putPhoto(id: string, dataUrl: string) {
    this.photos.set(id, dataUrl);
  }
  async deletePhoto(id: string) {
    this.photos.delete(id);
  }
  async allPhotos() {
    return Object.fromEntries(this.photos);
  }
  async clear() {
    this.kv.clear();
    this.photos.clear();
  }
}

const DB_NAME = "nido";
const DB_VERSION = 1;

export class IdbRepository implements Repository {
  private dbp: Promise<IDBPDatabase>;

  constructor(name = DB_NAME) {
    this.dbp = openDB(name, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("kv");
        db.createObjectStore("photos");
      },
    });
  }

  async getAll() {
    const db = await this.dbp;
    const keys = (await db.getAllKeys("kv")) as string[];
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = await db.get("kv", k);
    return out as Partial<AppData>;
  }
  async set<K extends keyof AppData>(key: K, value: AppData[K]) {
    await (await this.dbp).put("kv", JSON.parse(JSON.stringify(value)), key);
  }
  async getPhoto(id: string) {
    return (await (await this.dbp).get("photos", id)) as string | undefined;
  }
  async putPhoto(id: string, dataUrl: string) {
    await (await this.dbp).put("photos", dataUrl, id);
  }
  async deletePhoto(id: string) {
    await (await this.dbp).delete("photos", id);
  }
  async allPhotos() {
    const db = await this.dbp;
    const keys = (await db.getAllKeys("photos")) as string[];
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = (await db.get("photos", k)) as string;
    return out;
  }
  async clear() {
    const db = await this.dbp;
    await db.clear("kv");
    await db.clear("photos");
  }
}
