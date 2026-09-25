import type { Repository } from "./repository";
import { DATA_KEYS, DEFAULT_SETTINGS, defaultData, type AppData } from "./schema";

export const BACKUP_VERSION = 1;

export interface Backup {
  app: "nido";
  version: number;
  exportedAt: string;
  data: Partial<AppData>;
  photos: Record<string, string>;
}

/** Everything the user owns, as a plain JSON-serialisable object. AI keys are never included. */
export async function exportBackup(repo: Repository, now = new Date()): Promise<Backup> {
  return {
    app: "nido",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: await repo.getAll(),
    photos: await repo.allPhotos(),
  };
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/** Validate untrusted JSON and return a clean Backup, or throw a descriptive Error. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("invalid-json");
  }
  if (!isObj(raw) || raw.app !== "nido") throw new Error("not-a-nido-backup");
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION)
    throw new Error("unsupported-version");
  if (!isObj(raw.data)) throw new Error("missing-data");

  const defaults = defaultData();
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    const v = raw.data[key];
    if (v === undefined) continue;
    const expectArray = Array.isArray(defaults[key]);
    if (key === "settings") {
      if (!isObj(v)) throw new Error("bad-settings");
      data[key] = { ...DEFAULT_SETTINGS, ...v };
    } else if (expectArray ? Array.isArray(v) : isObj(v)) {
      data[key] = v;
    } else {
      throw new Error(`bad-${key}`);
    }
  }
  const photos: Record<string, string> = {};
  if (isObj(raw.photos)) {
    for (const [id, url] of Object.entries(raw.photos)) {
      if (typeof url === "string" && url.startsWith("data:image/")) photos[id] = url;
    }
  }
  return {
    app: "nido",
    version: raw.version,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    data: data as Partial<AppData>,
    photos,
  };
}

/** Replace all local data with the backup contents. */
export async function importBackup(repo: Repository, backup: Backup): Promise<void> {
  await repo.clear();
  for (const key of DATA_KEYS) {
    const v = backup.data[key];
    if (v !== undefined) await repo.set(key, v as never);
  }
  for (const [id, url] of Object.entries(backup.photos)) await repo.putPhoto(id, url);
}
